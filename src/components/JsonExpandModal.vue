<template>
  <div
    class="modal fade show d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    @click.self="handleClose"
  >
    <div class="modal-dialog modal-expand-json">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <BiCodeSquare />
            {{ title }}
          </h5>
          <button type="button" class="btn-close" @click="handleClose" aria-label="Close"></button>
        </div>
        <div class="modal-body p-0">
          <div ref="editorContainer" class="expand-editor-container" />
        </div>
        <div class="modal-footer">
          <template v-if="!readOnly">
            <div class="me-auto validation-status">
              <span v-if="hasError" class="text-danger small">
                <BiExclamationTriangle /> Invalid JSON
              </span>
              <span v-else-if="currentContent.trim()" class="text-success small">
                <BiCheck /> Valid JSON
              </span>
            </div>
            <button type="button" class="btn btn-secondary" @click="handleClose">Cancel</button>
            <button type="button" class="btn btn-primary" :disabled="hasError" @click="handleApply">
              Apply
            </button>
          </template>
          <template v-else>
            <button type="button" class="btn btn-secondary" @click="handleClose">Close</button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getCodeMirror, getLoadedCodeMirror } from '@/utils/codemirror-loader'
import type { EditorView } from '@codemirror/view'
import BiCodeSquare from 'bootstrap-icons/icons/code-square.svg'
import BiExclamationTriangle from 'bootstrap-icons/icons/exclamation-triangle.svg'
import BiCheck from 'bootstrap-icons/icons/check.svg'

interface Props {
  title: string
  initialValue: string
  readOnly?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'apply', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const editorContainer = ref<HTMLElement | null>(null)
const currentContent = ref(props.initialValue)
const hasError = ref(false)

let editorView: EditorView | null = null
let themeObserver: MutationObserver | null = null

function getTheme(): 'dark' | 'light' {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light'
}

function validateJson(content: string): void {
  if (!content.trim()) {
    hasError.value = false
    return
  }
  try {
    JSON.parse(content)
    hasError.value = false
  } catch {
    hasError.value = true
  }
}

async function initEditor(): Promise<void> {
  if (!editorContainer.value) return
  const cm = await getCodeMirror()
  if (!editorContainer.value) return

  if (editorView) {
    cm.destroyEditor(editorView)
    editorView = null
    editorContainer.value.innerHTML = ''
  }

  currentContent.value = props.initialValue

  if (props.readOnly) {
    editorView = cm.createReadOnlyEditor(editorContainer.value, currentContent.value, getTheme())
  } else {
    validateJson(currentContent.value)
    editorView = cm.createJsonEditor(editorContainer.value, currentContent.value, getTheme(), {
      onChange: (content) => {
        currentContent.value = content
        validateJson(content)
      },
      onSubmit: handleApply,
    })
  }

  editorView.focus()
}

function handleClose(): void {
  emit('close')
}

function handleApply(): void {
  if (hasError.value) return
  emit('apply', currentContent.value)
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') handleClose()
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeyDown)
  document.body.classList.add('modal-open')

  try {
    await initEditor()
  } catch (err) {
    console.error('Failed to load CodeMirror in expand modal:', err)
  }

  themeObserver = new MutationObserver(() => {
    initEditor().catch(console.error)
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-bs-theme'],
  })
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.body.classList.remove('modal-open')
  themeObserver?.disconnect()
  themeObserver = null

  if (editorView) {
    const cm = getLoadedCodeMirror()
    if (cm) cm.destroyEditor(editorView)
    editorView = null
  }
})
</script>

<style scoped>
.modal {
  background: rgba(0, 0, 0, 0.5);
}

.modal-expand-json {
  width: min(90vw, 1200px);
  max-width: min(90vw, 1200px);
  height: 85vh;
  margin: 7.5vh auto;
}

.modal-expand-json .modal-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.modal-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.expand-editor-container {
  height: 100%;
  overflow: hidden;
}

.expand-editor-container :deep(.cm-editor) {
  height: 100%;
}

.expand-editor-container :deep(.cm-scroller) {
  height: 100%;
  overflow: auto;
}

.modal-header .modal-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.modal-header .modal-title > :first-child {
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.validation-status {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
}

@media (max-width: 767.98px) {
  .modal-expand-json {
    width: calc(100vw - 2rem);
    max-width: none;
    height: calc(100vh - 2rem);
    margin: 1rem;
  }
}
</style>
