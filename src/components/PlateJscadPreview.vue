<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { getCodeMirror } from '@/utils/codemirror-loader'
import type { EditorView } from '@codemirror/view'
import BiClipboard from 'bootstrap-icons/icons/clipboard.svg'
import BiClipboardCheck from 'bootstrap-icons/icons/clipboard-check.svg'

const props = defineProps<{
  jscadScript: string | undefined
}>()

const containerRef = ref<HTMLDivElement>()
const editorReady = ref(false)
const loadError = ref(false)
const copied = ref(false)

let editorView: EditorView | null = null
let themeObserver: MutationObserver | null = null
let copyTimeout: ReturnType<typeof setTimeout> | null = null

function getTheme(): 'dark' | 'light' {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light'
}

async function initEditor() {
  if (!containerRef.value || !props.jscadScript) return

  try {
    const cm = await getCodeMirror()
    if (!containerRef.value) return // component may have unmounted
    editorView = cm.createReadOnlyEditor(containerRef.value, props.jscadScript, getTheme())
    editorReady.value = true
  } catch (err) {
    console.error('Failed to load CodeMirror:', err)
    loadError.value = true
  }
}

onMounted(() => {
  initEditor()

  // Watch for theme changes (Bootstrap data-bs-theme attribute)
  themeObserver = new MutationObserver(() => {
    if (!editorView || !editorReady.value) return
    const content = editorView.state.doc.toString()
    editorView.destroy()
    editorView = null
    editorReady.value = false
    if (containerRef.value) containerRef.value.innerHTML = ''
    if (!containerRef.value) return
    getCodeMirror()
      .then((cm) => {
        if (!containerRef.value) return
        editorView = cm.createReadOnlyEditor(containerRef.value, content, getTheme())
        editorReady.value = true
      })
      .catch((err) => {
        console.error('Failed to rebuild editor on theme change:', err)
        loadError.value = true
      })
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-bs-theme'],
  })
})

onUnmounted(() => {
  editorView?.destroy()
  editorView = null
  themeObserver?.disconnect()
  themeObserver = null
  if (copyTimeout !== null) clearTimeout(copyTimeout)
})

// Update editor content when jscadScript changes
watch(
  () => props.jscadScript,
  (newScript) => {
    if (!newScript) return
    if (editorView && editorReady.value) {
      getCodeMirror()
        .then((cm) => {
          if (editorView && newScript) cm.updateContent(editorView, newScript)
        })
        .catch((err) => console.error('Failed to update editor content:', err))
    } else if (!editorView && !loadError.value) {
      // Editor not yet created (e.g. prop arrived after mount but before async init completed,
      // or initEditor bailed because jscadScript was undefined at mount time)
      initEditor()
    }
  },
)

async function copyToClipboard() {
  if (!props.jscadScript) return
  try {
    await navigator.clipboard.writeText(props.jscadScript)
    copied.value = true
    if (copyTimeout !== null) clearTimeout(copyTimeout)
    copyTimeout = setTimeout(() => {
      copied.value = false
      copyTimeout = null
    }, 2000)
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}
</script>

<template>
  <div class="jscad-preview">
    <div class="jscad-toolbar">
      <span class="jscad-label">JSCAD Script (readonly)</span>
      <button
        class="copy-btn"
        :class="{ copied }"
        :title="copied ? 'Copied!' : 'Copy to clipboard'"
        :disabled="!jscadScript"
        @click="copyToClipboard"
      >
        <BiClipboardCheck v-if="copied" />
        <BiClipboard v-else />
        <span>{{ copied ? 'Copied!' : 'Copy' }}</span>
      </button>
    </div>

    <div class="editor-wrapper">
      <div v-if="loadError" class="editor-placeholder error">
        <p class="text-muted small mb-0">Failed to load code editor.</p>
      </div>
      <div v-else-if="!editorReady" class="editor-placeholder">
        <p class="text-muted small mb-0">Loading editor...</p>
      </div>
      <div v-show="editorReady && !loadError" ref="containerRef" class="cm-container"></div>
    </div>
  </div>
</template>

<style scoped>
.jscad-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.jscad-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 4px 12px;
  border: 1px solid var(--bs-border-color);
  border-bottom: none;
  border-radius: 0.375rem 0.375rem 0 0;
  background: var(--bs-secondary-bg);
  flex-shrink: 0;
}

.jscad-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: var(--bs-secondary-color);
  text-transform: uppercase;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--bs-secondary-color);
  background: transparent;
  border: 1px solid var(--bs-border-color);
  border-radius: 4px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    border-color 0.15s ease;
  line-height: 1;
}

.copy-btn svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.copy-btn:hover:not(:disabled) {
  color: var(--bs-body-color);
  background-color: var(--bs-tertiary-bg);
  border-color: var(--bs-border-color);
}

.copy-btn.copied {
  color: var(--bs-success);
  border-color: var(--bs-success);
}

.copy-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.editor-wrapper {
  flex-grow: 1;
  min-height: 0;
  border: 1px solid var(--bs-border-color);
  border-radius: 0 0 0.375rem 0.375rem;
  overflow: hidden;
}

.editor-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 1rem;
}

.editor-placeholder.error {
  color: var(--bs-danger);
}

.cm-container {
  height: 100%;
  overflow: auto;
}

/* Override CodeMirror default height to fill container */
.cm-container :deep(.cm-editor) {
  height: 100%;
}

.cm-container :deep(.cm-scroller) {
  height: 100%;
  overflow: auto;
}
</style>
