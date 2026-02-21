import { describe, it, expect } from 'vitest'
import { HtmlLayoutRenderer } from '../HtmlLayoutRenderer'
import type { LayoutRenderInput } from '../LayoutRendererTypes'

const makeInput = (overrides: Partial<LayoutRenderInput> = {}): LayoutRenderInput => ({
  layoutName: 'Test Board',
  author: 'Jane Doe',
  backColor: '#cccccc',
  radiiValue: '8px',
  unit: 54,
  boardWidth: 162,
  boardHeight: 54,
  keys: [
    { left: 0, top: 0, width: 54, height: 54, topLeftLabel: 'A', bottomLeftLabel: '' },
    { left: 54, top: 0, width: 54, height: 54, topLeftLabel: 'B', bottomLeftLabel: 'fn' },
    { left: 108, top: 0, width: 54, height: 54, topLeftLabel: '', bottomLeftLabel: '' },
  ],
  ...overrides,
})

describe('HtmlLayoutRenderer', () => {
  const renderer = new HtmlLayoutRenderer()

  it('returns a string starting with <!DOCTYPE html>', () => {
    const html = renderer.render(makeInput())
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/)
  })

  it('includes the layout name in the <title>', () => {
    const html = renderer.render(makeInput({ layoutName: 'My Keyboard' }))
    expect(html).toContain('<title>My Keyboard</title>')
  })

  it('escapes HTML special chars in the title', () => {
    const html = renderer.render(makeInput({ layoutName: '<script>alert(1)</script>' }))
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
  })

  it('renders the layout name as an h1', () => {
    const html = renderer.render(makeInput({ layoutName: 'My Board' }))
    expect(html).toContain('<h1 class="keyboard-title">My Board</h1>')
  })

  it('omits the h1 when layoutName is empty', () => {
    const html = renderer.render(makeInput({ layoutName: '' }))
    expect(html).not.toContain('<h1 class="keyboard-title">')
  })

  it('renders the author paragraph', () => {
    const html = renderer.render(makeInput({ author: 'Jane Doe' }))
    expect(html).toContain('<p class="keyboard-author">by Jane Doe</p>')
  })

  it('omits the author paragraph when author is empty', () => {
    const html = renderer.render(makeInput({ author: '' }))
    expect(html).not.toContain('<p class="keyboard-author">')
  })

  it('reflects backColor in the CSS board rule', () => {
    const html = renderer.render(makeInput({ backColor: '#ff0000' }))
    expect(html).toContain('background: #ff0000')
  })

  it('reflects radiiValue in the CSS board rule', () => {
    const html = renderer.render(makeInput({ radiiValue: '12px' }))
    expect(html).toContain('border-radius: 12px')
  })

  it('reflects unit in CSS variables', () => {
    const html = renderer.render(makeInput({ unit: 60 }))
    expect(html).toContain('--unit: 60px')
  })

  it('reflects boardWidth and boardHeight in CSS variables', () => {
    const html = renderer.render(makeInput({ boardWidth: 300, boardHeight: 100 }))
    expect(html).toContain('--board-width: 300px')
    expect(html).toContain('--board-height: 100px')
  })

  it('renders a .key div for each key', () => {
    const html = renderer.render(makeInput())
    const keyDivCount = (html.match(/class="key"/g) ?? []).length
    expect(keyDivCount).toBe(3)
  })

  it('renders key position and size as inline styles', () => {
    const html = renderer.render(makeInput())
    expect(html).toContain('left:0px;top:0px;width:54px;height:54px')
    expect(html).toContain('left:54px;top:0px;width:54px;height:54px')
  })

  it('renders top-left label with label-tl span', () => {
    const html = renderer.render(makeInput())
    expect(html).toContain('<span class="label-tl">A</span>')
    expect(html).toContain('<span class="label-tl">B</span>')
  })

  it('renders bottom-left label with label-bl span', () => {
    const html = renderer.render(makeInput())
    expect(html).toContain('<span class="label-bl">fn</span>')
  })

  it('omits label spans when label is empty', () => {
    const input = makeInput({
      keys: [{ left: 0, top: 0, width: 54, height: 54, topLeftLabel: '', bottomLeftLabel: '' }],
    })
    const html = renderer.render(input)
    expect(html).not.toContain('<span class="label-tl">')
    expect(html).not.toContain('<span class="label-bl">')
  })

  it('includes a footer link to the editor', () => {
    const html = renderer.render(makeInput())
    expect(html).toContain('keyboard-footer')
    expect(html).toContain('editor.keyboard-tools.xyz')
  })

  it('handles an empty keys array gracefully', () => {
    const html = renderer.render(makeInput({ keys: [] }))
    expect(html).toContain('<div class="board">')
  })
})
