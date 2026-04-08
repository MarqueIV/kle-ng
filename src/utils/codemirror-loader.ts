/**
 * Lazy loader for CodeMirror modules.
 * Mirrors the pattern in three-loader.ts: singleton cache, shared in-flight promise,
 * 30s timeout, and .finally() reset so a failed load allows retry.
 */

import type { EditorView } from '@codemirror/view'

export interface JsonEditorOptions {
  onChange: (content: string) => void
  onSubmit?: () => void
  readOnly?: boolean
}

export interface CodeMirrorAPI {
  createReadOnlyEditor(container: HTMLElement, content: string, theme: 'dark' | 'light'): EditorView
  createJsonEditor(
    container: HTMLElement,
    content: string,
    theme: 'dark' | 'light',
    options: JsonEditorOptions,
  ): EditorView
  updateContent(view: EditorView, content: string): void
  setReadOnly(view: EditorView, readOnly: boolean): void
  destroyEditor(view: EditorView): void
}

const LOAD_TIMEOUT_MS = 30_000

let loadedApi: CodeMirrorAPI | null = null
let loadingPromise: Promise<CodeMirrorAPI> | null = null

/**
 * Preload CodeMirror modules after initial render.
 */
export function preloadCodeMirror(): void {
  const cb = () => {
    getCodeMirror().catch((err) => {
      console.warn('Failed to preload CodeMirror modules:', err)
    })
  }
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(cb, { timeout: 2000 })
  } else {
    setTimeout(cb, 100)
  }
}

/**
 * Get CodeMirror API (lazy-loaded).
 * Returns cached API if available; otherwise initiates load with timeout.
 */
export async function getCodeMirror(): Promise<CodeMirrorAPI> {
  if (loadedApi) return loadedApi
  if (loadingPromise) return loadingPromise

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`CodeMirror load timed out after ${LOAD_TIMEOUT_MS}ms`)),
      LOAD_TIMEOUT_MS,
    ),
  )

  loadingPromise = Promise.race([
    Promise.all([
      import('@codemirror/view'),
      import('@codemirror/state'),
      import('@codemirror/language'),
      import('@codemirror/lang-javascript'),
      import('@codemirror/lang-json'),
      import('@codemirror/theme-one-dark'),
    ]).then(
      ([
        { EditorView, keymap, lineNumbers, drawSelection, highlightSpecialChars },
        { EditorState, Compartment },
        { syntaxHighlighting, defaultHighlightStyle },
        { javascript },
        { json },
        { oneDark },
      ]) => {
        // Per-view compartment registry for dynamic reconfiguration
        const readOnlyCompartments = new WeakMap<EditorView, InstanceType<typeof Compartment>>()

        function makeThemeExtensions(theme: 'dark' | 'light') {
          const baseTheme = EditorView.theme(
            {
              '&': {
                height: '100%',
                fontSize: '12px',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
              },
              '.cm-scroller': { overflow: 'auto' },
            },
            { dark: theme === 'dark' },
          )
          return theme === 'dark'
            ? [oneDark, baseTheme]
            : [syntaxHighlighting(defaultHighlightStyle), baseTheme]
        }

        const api: CodeMirrorAPI = {
          createReadOnlyEditor(container: HTMLElement, content: string, theme: 'dark' | 'light') {
            const state = EditorState.create({
              doc: content,
              extensions: [
                lineNumbers(),
                highlightSpecialChars(),
                drawSelection(),
                javascript(),
                ...makeThemeExtensions(theme),
                EditorState.readOnly.of(true),
                EditorView.lineWrapping,
              ],
            })
            return new EditorView({ state, parent: container })
          },

          createJsonEditor(
            container: HTMLElement,
            content: string,
            theme: 'dark' | 'light',
            options: JsonEditorOptions,
          ) {
            const { onChange, onSubmit, readOnly = false } = options
            const readOnlyCompartment = new Compartment()

            const keymapExtension = onSubmit
              ? keymap.of([
                  {
                    key: 'Ctrl-Enter',
                    mac: 'Cmd-Enter',
                    run: () => {
                      onSubmit()
                      return true
                    },
                  },
                ])
              : []

            const state = EditorState.create({
              doc: content,
              extensions: [
                lineNumbers(),
                highlightSpecialChars(),
                drawSelection(),
                json(),
                ...makeThemeExtensions(theme),
                readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
                EditorView.updateListener.of((update) => {
                  if (update.docChanged) onChange(update.state.doc.toString())
                }),
                keymapExtension,
                EditorView.lineWrapping,
              ],
            })

            const view = new EditorView({ state, parent: container })
            readOnlyCompartments.set(view, readOnlyCompartment)
            return view
          },

          updateContent(view: EditorView, content: string) {
            const current = view.state.doc.toString()
            if (current === content) return
            view.dispatch({
              changes: { from: 0, to: view.state.doc.length, insert: content },
            })
          },

          setReadOnly(view: EditorView, readOnly: boolean) {
            const compartment = readOnlyCompartments.get(view)
            if (!compartment) return
            view.dispatch({
              effects: compartment.reconfigure(EditorState.readOnly.of(readOnly)),
            })
          },

          destroyEditor(view: EditorView) {
            readOnlyCompartments.delete(view)
            view.destroy()
          },
        }

        loadedApi = api
        return api
      },
    ),
    timeout,
  ]).finally(() => {
    if (!loadedApi) loadingPromise = null
  }) as Promise<CodeMirrorAPI>

  return loadingPromise
}
