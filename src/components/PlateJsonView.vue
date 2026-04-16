<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { usePlateGeneratorStore } from '@/stores/plateGenerator'
import { getCodeMirror, getLoadedCodeMirror } from '@/utils/codemirror-loader'
import { serializePlateSettings } from '@/utils/plate/plate-settings-serializer'
import { validatePlateSettingsJson } from '@/utils/plate/plate-settings-validator'
import type { PlateSettingsJson } from '@/utils/plate/plate-settings-serializer'
import type { EditorView } from '@codemirror/view'
import BiUpload from 'bootstrap-icons/icons/upload.svg'
import BiDownload from 'bootstrap-icons/icons/download.svg'

const plateStore = usePlateGeneratorStore()

// ---------------------------------------------------------------------------
// Editor DOM refs
// ---------------------------------------------------------------------------
const editorContainer = ref<HTMLDivElement>()
const editorReady = ref(false)
const loadError = ref(false)
const fileInputRef = ref<HTMLInputElement>()

let editorView: EditorView | null = null
let themeObserver: MutationObserver | null = null

// ---------------------------------------------------------------------------
// Editor state
// ---------------------------------------------------------------------------
const isDirty = ref(false)
const validationError = ref<string | null>(null)
const validationWarnings = ref<string[]>([])
const parsedJson = ref<PlateSettingsJson | null>(null)
const editorText = ref('')

// ---------------------------------------------------------------------------
// Derived state
// ---------------------------------------------------------------------------
const canApply = computed(
  () => isDirty.value && validationError.value === null && parsedJson.value !== null,
)
const canReset = computed(() => isDirty.value)

const statusText = computed(() => {
  if (validationError.value) return `Error: ${validationError.value}`
  if (validationWarnings.value.length > 0)
    return `${validationWarnings.value.length} warning(s): ${validationWarnings.value[0]}`
  if (isDirty.value) return 'Modified — press Apply or Ctrl+Enter to apply'
  return 'In sync'
})

const statusClass = computed(() => {
  if (validationError.value) return 'text-danger'
  if (validationWarnings.value.length > 0) return 'text-warning'
  if (isDirty.value) return 'text-warning'
  return 'text-muted'
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getTheme(): 'dark' | 'light' {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light'
}

function getCanonicalJson(): string {
  return JSON.stringify(serializePlateSettings(plateStore.settings), null, 2)
}

function validate(text: string): void {
  const result = validatePlateSettingsJson(text)
  if (result.valid) {
    validationError.value = null
    validationWarnings.value = result.warnings
    parsedJson.value = result.json
  } else {
    validationError.value = result.error
    validationWarnings.value = []
    parsedJson.value = null
  }
}

function setEditorContent(text: string): void {
  getCodeMirror()
    .then((cm) => {
      if (editorView) cm.updateContent(editorView, text)
    })
    .catch((err) => console.error('Failed to update plate JSON view:', err))
}

// ---------------------------------------------------------------------------
// Editor callbacks
// ---------------------------------------------------------------------------
function onEditorChange(text: string): void {
  editorText.value = text
  isDirty.value = true
  validate(text)
}

function applyEdits(): void {
  if (!canApply.value || !parsedJson.value) return
  isDirty.value = false
  plateStore.applySettings(parsedJson.value)
}

function resetEdits(): void {
  const canonical = getCanonicalJson()
  editorText.value = canonical
  isDirty.value = false
  validationError.value = null
  validationWarnings.value = []
  parsedJson.value = null
  setEditorContent(canonical)
}

// ---------------------------------------------------------------------------
// Button actions
// ---------------------------------------------------------------------------

function downloadJson(): void {
  const text = isDirty.value ? editorText.value : getCanonicalJson()
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'plate-settings.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function triggerUpload(): void {
  fileInputRef.value?.click()
}

function onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    const result = validatePlateSettingsJson(text)
    if (result.valid) {
      // Valid: apply immediately, sync editor explicitly, clear dirty
      isDirty.value = false
      validationError.value = null
      validationWarnings.value = result.warnings
      parsedJson.value = null
      plateStore.applySettings(result.json)
      setEditorContent(getCanonicalJson())
    } else {
      // Invalid: load into editor as dirty so user can fix
      editorText.value = text
      isDirty.value = true
      validationError.value = result.error
      validationWarnings.value = []
      parsedJson.value = null
      setEditorContent(text)
    }

    input.value = ''
  }
  reader.readAsText(file)
}

// ---------------------------------------------------------------------------
// Editor lifecycle
// ---------------------------------------------------------------------------
async function rebuildEditor(): Promise<void> {
  if (!editorContainer.value) return
  const cm = await getCodeMirror()
  if (!editorContainer.value) return

  if (editorView) {
    cm.destroyEditor(editorView)
    editorView = null
    editorContainer.value.innerHTML = ''
  }

  // Preserve dirty text across theme rebuilds
  const content = isDirty.value ? editorText.value : getCanonicalJson()

  editorView = cm.createJsonEditor(editorContainer.value, content, getTheme(), {
    onChange: onEditorChange,
    onSubmit: applyEdits,
    readOnly: false,
  })
}

// Store watch: update editor only when clean
watch(
  () => plateStore.settings,
  () => {
    if (isDirty.value) return
    if (!editorView) return
    setEditorContent(getCanonicalJson())
  },
  { deep: true },
)

onMounted(async () => {
  try {
    await rebuildEditor()
    editorReady.value = true
  } catch (err) {
    console.error('Failed to load CodeMirror for plate JSON view:', err)
    loadError.value = true
  }

  themeObserver = new MutationObserver(() => {
    rebuildEditor().catch((err) => {
      console.error('Failed to rebuild plate JSON view on theme change:', err)
      loadError.value = true
    })
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-bs-theme'],
  })
})

// ---------------------------------------------------------------------------
// Resize handle
// ---------------------------------------------------------------------------
const editorHeight = ref(250)
let dragStartY = 0
let dragStartHeight = 0

function onDragMouseMove(e: MouseEvent): void {
  editorHeight.value = Math.max(100, dragStartHeight + (e.clientY - dragStartY))
}

function onDragMouseUp(): void {
  document.removeEventListener('mousemove', onDragMouseMove)
  document.removeEventListener('mouseup', onDragMouseUp)
}

function onResizeHandleMouseDown(e: MouseEvent): void {
  dragStartY = e.clientY
  dragStartHeight = editorHeight.value
  document.addEventListener('mousemove', onDragMouseMove)
  document.addEventListener('mouseup', onDragMouseUp)
  e.preventDefault()
}

onUnmounted(() => {
  if (editorView) {
    const view = editorView
    editorView = null
    const cm = getLoadedCodeMirror()
    if (cm) {
      cm.destroyEditor(view)
    } else {
      view.destroy() // CM never finished loading; destroy directly
    }
  }
  themeObserver?.disconnect()
  themeObserver = null
  document.removeEventListener('mousemove', onDragMouseMove)
  document.removeEventListener('mouseup', onDragMouseUp)
})
</script>

<template>
  <div class="json-view plate-json-view">
    <!-- Button bar -->
    <div class="button-bar">
      <div class="button-bar-left">
        <button
          class="btn btn-primary btn-sm"
          :disabled="!canApply"
          title="Apply changes (Ctrl+Enter)"
          @click="applyEdits"
        >
          Apply
        </button>
        <button
          class="btn btn-outline-secondary btn-sm"
          :disabled="!canReset"
          title="Reset to current settings"
          @click="resetEdits"
        >
          Reset
        </button>
      </div>
      <div class="button-bar-right">
        <button
          class="btn btn-outline-secondary btn-sm"
          :class="{ 'btn-outline-warning': isDirty && validationError }"
          :title="
            isDirty && validationError
              ? 'Download current editor content (contains errors)'
              : 'Download as plate-settings.json'
          "
          @click="downloadJson"
        >
          <BiDownload aria-hidden="true" />
        </button>
        <button
          class="btn btn-outline-secondary btn-sm"
          title="Upload JSON file"
          @click="triggerUpload"
        >
          <BiUpload aria-hidden="true" />
          Upload
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json,application/json"
          class="file-input-hidden"
          @change="onFileSelected"
        />
      </div>
    </div>

    <!-- Editor area -->
    <div
      v-if="!editorReady && !loadError"
      class="editor-placeholder"
      :style="{ height: editorHeight + 'px' }"
    >
      <span class="text-muted small">Loading editor...</span>
    </div>
    <div v-else-if="loadError" class="editor-placeholder" :style="{ height: editorHeight + 'px' }">
      <span class="text-danger small">Failed to load editor.</span>
    </div>
    <div
      v-show="editorReady && !loadError"
      ref="editorContainer"
      class="cm-editor-container"
      :style="{ height: editorHeight + 'px' }"
    ></div>

    <!-- Resize handle -->
    <div class="resize-handle" @mousedown="onResizeHandleMouseDown"></div>

    <!-- Status bar -->
    <div class="status-bar">
      <span class="small" :class="statusClass">{{ statusText }}</span>
    </div>
  </div>
</template>

<style scoped>
.json-view {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.button-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
  padding: 0.375rem 0.5rem;
  border-bottom: 1px solid var(--bs-border-color);
  background: var(--bs-tertiary-bg);
  flex-wrap: wrap;
}

.button-bar-left,
.button-bar-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.editor-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.cm-editor-container {
  overflow: auto;
}

.resize-handle {
  height: 8px;
  cursor: ns-resize;
  background: var(--bs-tertiary-bg);
  border-top: 1px solid var(--bs-border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  user-select: none;
}

.resize-handle::after {
  content: '';
  width: 2rem;
  border-top: 1px solid var(--bs-secondary-color);
  box-shadow: 0 2px 0 var(--bs-secondary-color);
  opacity: 0.35;
}

.resize-handle:hover {
  background: var(--bs-secondary-bg);
}

.resize-handle:hover::after {
  opacity: 0.6;
}

.cm-editor-container :deep(.cm-editor) {
  height: 100%;
}

.cm-editor-container :deep(.cm-scroller) {
  height: 100%;
  overflow: auto;
}

.status-bar {
  padding: 0.25rem 0.5rem;
  border-top: 1px solid var(--bs-border-color);
  background: var(--bs-tertiary-bg);
  min-height: 1.75rem;
  display: flex;
  align-items: center;
}

.file-input-hidden {
  display: none;
}
</style>
