/**
 * Matcher expression DSL parser and evaluator.
 *
 * Grammar:
 *   expr     = or_expr
 *   or_expr  = and_expr  ("or"  and_expr)*
 *   and_expr = not_expr  ("and" not_expr)*
 *   not_expr = "not" not_expr | primary
 *   primary  = "(" expr ")"
 *            | flag                               e.g.  decal  ghost  stepped  nub
 *            | numeric_prop cmp_op number         e.g.  width >= 1.5   x < 3
 *            | "label" ["[" int "]"] label_op str e.g.  label == "Esc"  label[0] matches "^F\d+$"
 *
 *   flag          = "decal" | "ghost" | "stepped" | "nub"
 *   numeric_prop  = "width" | "height" | "x" | "y" | "rotation"
 *   cmp_op        = ">" | ">=" | "<" | "<=" | "=" | "==" | "!=" | "<>"
 *   label_op      = "=" | "==" | "!=" | "contains" | "matches"
 *
 * Examples:
 *   width >= 1.5
 *   width >= 6 and not decal
 *   ghost or stepped
 *   label == "Esc"
 *   label[0] matches "^F\d+$"
 *   label contains "Shift" and not decal
 *   not (ghost or decal)
 *   x >= 5 and y < 2 or rotation != 0
 */

import type { Key } from '@adamws/kle-serial'

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

type Token =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'lbracket' }
  | { type: 'rbracket' }
  | { type: 'eof' }

// ---------------------------------------------------------------------------
// AST types
// ---------------------------------------------------------------------------

type NumericProp = 'width' | 'height' | 'x' | 'y' | 'rotation'
type FlagProp = 'decal' | 'ghost' | 'stepped' | 'nub'
type CmpOp = '>' | '>=' | '<' | '<=' | '=' | '!='
type LabelOp = 'eq' | 'neq' | 'contains' | 'matches'

type MatcherExpr =
  | { kind: 'and' | 'or'; left: MatcherExpr; right: MatcherExpr }
  | { kind: 'not'; expr: MatcherExpr }
  | { kind: 'compare'; prop: NumericProp; cmp: CmpOp; value: number }
  | { kind: 'label'; index: number | null; op: LabelOp; value: string }
  | { kind: 'flag'; name: FlagProp }

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

const NUMERIC_PROPS = new Set(['width', 'height', 'x', 'y', 'rotation'])
const FLAG_PROPS = new Set(['decal', 'ghost', 'stepped', 'nub'])

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    if (/\s/.test(input[i]!)) {
      i++
      continue
    }

    // Number
    if (/\d/.test(input[i]!)) {
      let num = ''
      while (i < input.length && /[\d.]/.test(input[i]!)) num += input[i++]
      tokens.push({ type: 'number', value: parseFloat(num) })
      continue
    }

    // Quoted string
    if (input[i] === '"' || input[i] === "'") {
      const quote = input[i++]
      let str = ''
      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\') {
          i++
          str += input[i++]
        } else str += input[i++]
      }
      if (i >= input.length) throw new Error('Unterminated string literal')
      i++ // closing quote
      tokens.push({ type: 'string', value: str })
      continue
    }

    // Identifier / keyword
    if (/[a-zA-Z_]/.test(input[i]!)) {
      let ident = ''
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i]!)) ident += input[i++]
      tokens.push({ type: 'ident', value: ident })
      continue
    }

    // Two-char operators
    if (i + 1 < input.length) {
      const two = input.slice(i, i + 2)
      if (['>=', '<=', '!=', '<>', '=='].includes(two)) {
        tokens.push({ type: 'op', value: two })
        i += 2
        continue
      }
    }

    // Single-char operators / punctuation
    const ch = input[i]
    if (ch === '>' || ch === '<' || ch === '=' || ch === '!') {
      tokens.push({ type: 'op', value: ch })
      i++
      continue
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen' })
      i++
      continue
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen' })
      i++
      continue
    }
    if (ch === '[') {
      tokens.push({ type: 'lbracket' })
      i++
      continue
    }
    if (ch === ']') {
      tokens.push({ type: 'rbracket' })
      i++
      continue
    }

    throw new Error(`Unexpected character: "${ch}"`)
  }

  tokens.push({ type: 'eof' })
  return tokens
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

class Parser {
  private pos = 0

  constructor(private readonly tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos]!
  }
  private advance(): Token {
    return this.tokens[this.pos++]!
  }

  private expectIdent(name?: string): string {
    const t = this.advance()
    if (t.type !== 'ident') throw new Error(`Expected identifier, got "${tokenStr(t)}"`)
    if (name && t.value !== name) throw new Error(`Expected "${name}", got "${t.value}"`)
    return t.value
  }

  private expectNumber(): number {
    const t = this.advance()
    if (t.type !== 'number') throw new Error(`Expected number, got "${tokenStr(t)}"`)
    return t.value
  }

  private expectString(): string {
    const t = this.advance()
    if (t.type !== 'string') throw new Error(`Expected quoted string, got "${tokenStr(t)}"`)
    return t.value
  }

  private expectOp(ops: string[]): string {
    const t = this.advance()
    if (t.type !== 'op' || !ops.includes(t.value)) {
      throw new Error(`Expected ${ops.map((o) => `"${o}"`).join(' or ')}, got "${tokenStr(t)}"`)
    }
    return t.value
  }

  private peekIdentIs(name: string): boolean {
    const t = this.peek()
    return t.type === 'ident' && t.value === name
  }

  parse(): MatcherExpr {
    const expr = this.parseOr()
    const remaining = this.peek()
    if (remaining.type !== 'eof') {
      throw new Error(`Unexpected token "${tokenStr(remaining)}" after expression`)
    }
    return expr
  }

  private parseOr(): MatcherExpr {
    let left = this.parseAnd()
    while (this.peekIdentIs('or')) {
      this.advance()
      left = { kind: 'or', left, right: this.parseAnd() }
    }
    return left
  }

  private parseAnd(): MatcherExpr {
    let left = this.parseNot()
    while (this.peekIdentIs('and')) {
      this.advance()
      left = { kind: 'and', left, right: this.parseNot() }
    }
    return left
  }

  private parseNot(): MatcherExpr {
    if (this.peekIdentIs('not')) {
      this.advance()
      return { kind: 'not', expr: this.parseNot() }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): MatcherExpr {
    const t = this.peek()

    // Parenthesised sub-expression
    if (t.type === 'lparen') {
      this.advance()
      const expr = this.parseOr()
      const close = this.advance()
      if (close.type !== 'rparen') throw new Error(`Expected ")", got "${tokenStr(close)}"`)
      return expr
    }

    if (t.type !== 'ident') throw new Error(`Expected expression, got "${tokenStr(t)}"`)
    const name = t.value

    // Flag (bare name)
    if (FLAG_PROPS.has(name)) {
      this.advance()
      return { kind: 'flag', name: name as FlagProp }
    }

    // Numeric property comparison
    if (NUMERIC_PROPS.has(name)) {
      this.advance()
      const cmp = this.parseCmpOp()
      const value = this.expectNumber()
      return { kind: 'compare', prop: name as NumericProp, cmp, value }
    }

    // Label check: label ["[" n "]"] op "string"
    if (name === 'label') {
      this.advance()
      let index: number | null = null
      if (this.peek().type === 'lbracket') {
        this.advance()
        index = this.expectNumber()
        const rb = this.advance()
        if (rb.type !== 'rbracket') throw new Error(`Expected "]", got "${tokenStr(rb)}"`)
      }
      const op = this.parseLabelOp()
      const value = this.expectString()
      if (op === 'matches') {
        try {
          new RegExp(value)
        } catch {
          throw new Error(`Invalid regular expression: /${value}/`)
        }
      }
      return { kind: 'label', index, op, value }
    }

    throw new Error(
      `Unknown identifier "${name}". Valid properties: width height x y rotation decal ghost stepped nub label`,
    )
  }

  private parseCmpOp(): CmpOp {
    const t = this.advance()
    if (t.type !== 'op') throw new Error(`Expected comparison operator, got "${tokenStr(t)}"`)
    switch (t.value) {
      case '>':
        return '>'
      case '>=':
        return '>='
      case '<':
        return '<'
      case '<=':
        return '<='
      case '=':
      case '==':
        return '='
      case '!=':
      case '<>':
        return '!='
      default:
        throw new Error(`Unknown operator "${t.value}"`)
    }
  }

  private parseLabelOp(): LabelOp {
    const t = this.peek()
    if (t.type === 'op') {
      this.advance()
      if (t.value === '=' || t.value === '==') return 'eq'
      if (t.value === '!=') return 'neq'
      throw new Error(`Expected label operator (= != contains matches), got "${t.value}"`)
    }
    if (t.type === 'ident') {
      if (t.value === 'contains') {
        this.advance()
        return 'contains'
      }
      if (t.value === 'matches') {
        this.advance()
        return 'matches'
      }
    }
    throw new Error(`Expected label operator (= != contains matches), got "${tokenStr(t)}"`)
  }
}

function tokenStr(t: Token): string {
  if (t.type === 'ident' || t.type === 'op') return t.value
  if (t.type === 'number') return String(t.value)
  if (t.type === 'string') return `"${t.value}"`
  return t.type
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

function getNumericProp(key: Key, prop: NumericProp): number {
  switch (prop) {
    case 'width':
      return key.width
    case 'height':
      return key.height
    case 'x':
      return key.x
    case 'y':
      return key.y
    case 'rotation':
      return key.rotation_angle ?? 0
  }
}

function evalExpr(expr: MatcherExpr, key: Key): boolean {
  switch (expr.kind) {
    case 'and':
      return evalExpr(expr.left, key) && evalExpr(expr.right, key)
    case 'or':
      return evalExpr(expr.left, key) || evalExpr(expr.right, key)
    case 'not':
      return !evalExpr(expr.expr, key)
    case 'flag':
      return !!key[expr.name]
    case 'compare': {
      const actual = getNumericProp(key, expr.prop)
      switch (expr.cmp) {
        case '>':
          return actual > expr.value
        case '>=':
          return actual >= expr.value
        case '<':
          return actual < expr.value
        case '<=':
          return actual <= expr.value
        case '=':
          return actual === expr.value
        case '!=':
          return actual !== expr.value
      }
    }
    case 'label': {
      const positions = expr.index !== null ? [expr.index] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      // neq means "no position equals value" — requires every(), not some()
      if (expr.op === 'neq') {
        return positions.every((i) => (key.labels[i] ?? '') !== expr.value)
      }
      return positions.some((i) => {
        const label = key.labels[i] ?? ''
        switch (expr.op) {
          case 'eq':
            return label === expr.value
          case 'contains':
            return label.includes(expr.value)
          case 'matches':
            return new RegExp(expr.value).test(label)
        }
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Cache compiled expressions to avoid re-parsing on every key
const exprCache = new Map<string, MatcherExpr>()

/**
 * Compile a matcher string into a predicate function.
 * Throws a descriptive error if the syntax is invalid.
 * The result is cached, so repeated calls with the same string are free.
 */
export function compileMatchers(matchers: string): (key: Key) => boolean {
  if (!exprCache.has(matchers)) {
    const tokens = tokenize(matchers.trim())
    const expr = new Parser(tokens).parse()
    exprCache.set(matchers, expr)
  }
  const expr = exprCache.get(matchers)!
  return (key) => evalExpr(expr, key)
}

/**
 * Validate a matcher string without applying it.
 * Returns an error message, or null if the syntax is valid.
 */
export function validateMatchers(matchers: string): string | null {
  try {
    compileMatchers(matchers)
    return null
  } catch (e) {
    return e instanceof Error ? e.message : 'Invalid matcher expression'
  }
}
