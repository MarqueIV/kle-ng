/**
 * Lazy loader for CodeMirror modules.
 * Mirrors the pattern in three-loader.ts: singleton cache, shared in-flight promise,
 * 30s timeout, and .finally() reset so a failed load allows retry.
 */

import type { EditorView } from '@codemirror/view'

export interface CodeMirrorAPI {
  createReadOnlyEditor(container: HTMLElement, content: string, theme: 'dark' | 'light'): EditorView
  updateContent(view: EditorView, content: string): void
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
      import('@codemirror/theme-one-dark'),
    ]).then(
      ([
        { EditorView, lineNumbers, highlightActiveLine, drawSelection, highlightSpecialChars },
        { EditorState },
        { syntaxHighlighting, defaultHighlightStyle },
        { javascript },
        { oneDark },
      ]) => {
        const api: CodeMirrorAPI = {
          createReadOnlyEditor(container: HTMLElement, content: string, theme: 'dark' | 'light') {
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

            const themeExtensions =
              theme === 'dark'
                ? [oneDark, baseTheme]
                : [syntaxHighlighting(defaultHighlightStyle), baseTheme]

            const state = EditorState.create({
              doc: content,
              extensions: [
                lineNumbers(),
                highlightSpecialChars(),
                drawSelection(),
                highlightActiveLine(),
                javascript(),
                ...themeExtensions,
                EditorState.readOnly.of(true),
                EditorView.lineWrapping,
              ],
            })

            return new EditorView({ state, parent: container })
          },

          updateContent(view: EditorView, content: string) {
            view.dispatch({
              changes: { from: 0, to: view.state.doc.length, insert: content },
            })
          },

          destroyEditor(view: EditorView) {
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
