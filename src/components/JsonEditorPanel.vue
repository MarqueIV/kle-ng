<template>
  <fieldset :disabled="isDisabled" :class="{ 'opacity-50': isDisabled }">
    <div class="mb-2">
      <div class="d-flex justify-content-between align-items-center">
        <span class="small">Edit the JSON directly</span>
        <div v-if="hasJsonError" class="text-danger small d-flex align-items-center gap-1">
          <BiExclamationTriangle /> Invalid JSON
        </div>
        <div
          v-else-if="hasChanges"
          class="text-warning small d-flex align-items-center gap-1"
          data-testid="unsaved-changes-indicator"
        >
          <BiPencil /> Unsaved changes
        </div>
        <div v-else class="text-success small d-flex align-items-center gap-1">
          <BiCheck /> Valid JSON
        </div>
        <div class="d-flex gap-2">
          <button
            @click="clearJson"
            class="btn btn-outline-danger btn-sm d-flex align-items-center"
            :disabled="isDisabled"
            title="Clear all"
          >
            <BiTrash />
          </button>
          <button
            @click="formatJson"
            class="btn btn-outline-secondary btn-sm"
            :disabled="hasJsonError || isDisabled"
          >
            Format
          </button>
          <button
            @click="applyChanges"
            class="btn btn-primary btn-sm"
            :disabled="hasJsonError || isDisabled"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>

    <div class="editor-wrapper" :class="{ 'is-invalid': hasJsonError }">
      <div v-if="!editorReady && !loadError" class="editor-placeholder">
        <span class="text-muted small">Loading editor...</span>
      </div>
      <div v-else-if="loadError" class="editor-placeholder">
        <span class="text-danger small">Failed to load editor.</span>
      </div>
      <div
        v-show="editorReady && !loadError"
        ref="editorContainer"
        class="cm-editor-container"
      ></div>
    </div>

    <div v-if="hasJsonError" class="invalid-feedback d-block mt-1">
      {{ jsonError }}
    </div>

    <div class="mt-2">
      <small class="text-muted">
        This editor supports the
        <a
          href="https://github.com/ijprest/keyboard-layout-editor/wiki/Serialized-Data-Format"
          target="_blank"
          class="text-decoration-none"
        >
          KLE JSON format</a
        >. JSON is validated automatically as you type. Changes are applied when you click "Apply
        Changes" or use Ctrl+Enter.
      </small>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useKeyboardStore } from '@/stores/keyboard'
import { parseJsonString } from '@/utils/serialization'
import { D } from '@/utils/decimal-math'
import { getCodeMirror } from '@/utils/codemirror-loader'
import type { EditorView } from '@codemirror/view'
import BiExclamationTriangle from 'bootstrap-icons/icons/exclamation-triangle.svg'
import BiPencil from 'bootstrap-icons/icons/pencil.svg'
import BiCheck from 'bootstrap-icons/icons/check.svg'
import BiTrash from 'bootstrap-icons/icons/trash.svg'

const keyboardStore = useKeyboardStore()

const editorContainer = ref<HTMLDivElement>()
const editorReady = ref(false)
const loadError = ref(false)

const jsonContent = ref('')
const originalJson = ref('')
const hasJsonError = ref(false)
const jsonError = ref('')

let editorView: EditorView | null = null
let themeObserver: MutationObserver | null = null

// ── Formatting ────────────────────────────────────────────────────────────────

const formatJsonCompact = (data: unknown[]): string => {
  const result: string[] = []
  data.forEach((elem) => result.push(toJsonCompactLine(elem)))
  return '[' + result.join(',\n') + ']'
}

const toJsonCompactLine = (obj: unknown): string => {
  if (Array.isArray(obj)) {
    return '[' + obj.map((elem) => toJsonCompactLine(elem)).join(',') + ']'
  }
  if (typeof obj === 'object' && obj !== null) {
    const pairs: string[] = []
    const objAsRecord = obj as Record<string, unknown>
    for (const key in objAsRecord) {
      if (Object.prototype.hasOwnProperty.call(objAsRecord, key)) {
        const value = objAsRecord[key]
        if (value !== undefined) {
          pairs.push(`${JSON.stringify(key)}:${toJsonCompactLine(value)}`)
        }
      }
    }
    return '{' + pairs.join(',') + '}'
  }
  if (typeof obj === 'number') {
    return D.format(obj, 6).toString()
  }
  return JSON.stringify(obj)
}

// ── Validation ────────────────────────────────────────────────────────────────

const validateJson = () => {
  try {
    parseJsonString(jsonContent.value)
    hasJsonError.value = false
    jsonError.value = ''
    return true
  } catch (error) {
    hasJsonError.value = true
    jsonError.value = error instanceof Error ? error.message : 'Invalid JSON format'
    return false
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────

const setEditorContent = (content: string) => {
  jsonContent.value = content
  if (editorView) {
    getCodeMirror()
      .then((cm) => {
        if (editorView) cm.updateContent(editorView, content)
      })
      .catch((err) => console.error('Failed to update editor content:', err))
  }
}

const formatJson = () => {
  if (validateJson()) {
    try {
      const parsed = parseJsonString(jsonContent.value)
      const formatted = Array.isArray(parsed)
        ? formatJsonCompact(parsed)
        : JSON.stringify(parsed, null, 2)
      setEditorContent(formatted)
    } catch (error) {
      console.error('Error formatting JSON:', error)
    }
  }
}

const clearJson = () => {
  setEditorContent('[]')
  validateJson()
}

const applyChanges = () => {
  if (!validateJson()) return
  try {
    const data = parseJsonString(jsonContent.value)
    keyboardStore.updateLayoutFromJson(data)
    if (Array.isArray(data)) {
      originalJson.value = formatJsonCompact(data)
      setEditorContent(originalJson.value)
    } else {
      originalJson.value = jsonContent.value
    }
  } catch (error) {
    console.error('Error applying JSON changes:', error)
    jsonError.value = error instanceof Error ? error.message : 'Error applying changes'
    hasJsonError.value = true
  }
}

// ── Computed ──────────────────────────────────────────────────────────────────

const hasChanges = computed(() => jsonContent.value !== originalJson.value && !hasJsonError.value)

const isDisabled = computed(
  () =>
    keyboardStore.canvasMode === 'rotate' ||
    keyboardStore.canvasMode === 'mirror-h' ||
    keyboardStore.canvasMode === 'mirror-v',
)

// ── Store sync ────────────────────────────────────────────────────────────────

const loadJsonFromStore = () => {
  try {
    const data = keyboardStore.getSerializedData('kle')
    const formatted = Array.isArray(data) ? formatJsonCompact(data) : JSON.stringify(data, null, 2)
    originalJson.value = formatted
    setEditorContent(formatted)
    hasJsonError.value = false
    jsonError.value = ''
  } catch (error) {
    console.error('Error loading JSON from store:', error)
    jsonError.value = 'Error loading layout data'
    hasJsonError.value = true
  }
}

watch(
  [() => keyboardStore.keys, () => keyboardStore.metadata],
  () => {
    loadJsonFromStore()
  },
  { deep: true },
)

// ── isDisabled → CodeMirror readOnly ─────────────────────────────────────────

watch(isDisabled, (disabled) => {
  if (editorView) {
    getCodeMirror().then((cm) => {
      if (editorView) cm.setReadOnly(editorView, disabled)
    })
  }
})

// ── Theme ─────────────────────────────────────────────────────────────────────

function getTheme(): 'dark' | 'light' {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light'
}

async function rebuildEditor() {
  if (!editorContainer.value) return
  const cm = await getCodeMirror()
  if (!editorContainer.value) return

  if (editorView) {
    cm.destroyEditor(editorView)
    editorView = null
    editorContainer.value.innerHTML = ''
  }

  // Read jsonContent.value after the await — it may have been updated by loadJsonFromStore()
  // while CodeMirror was loading (e.g. triggered by the store watcher).
  editorView = cm.createJsonEditor(editorContainer.value, jsonContent.value, getTheme(), {
    onChange: (newContent) => {
      jsonContent.value = newContent
      validateJson()
    },
    onSubmit: applyChanges,
    readOnly: isDisabled.value,
  })
}

// Initialize at setup time so jsonContent is populated before onMounted runs
loadJsonFromStore()

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  try {
    await rebuildEditor()
    editorReady.value = true
  } catch (err) {
    console.error('Failed to load CodeMirror:', err)
    loadError.value = true
  }

  themeObserver = new MutationObserver(() => {
    rebuildEditor().catch((err) => {
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
  if (editorView) {
    const view = editorView
    editorView = null
    getCodeMirror()
      .then((cm) => cm.destroyEditor(view))
      .catch(() => {})
  }
  themeObserver?.disconnect()
  themeObserver = null
})
</script>

<style scoped>
.editor-wrapper {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  overflow: hidden;
  transition: border-color 0.15s ease;
}

.editor-wrapper.is-invalid {
  border-color: var(--bs-danger);
}

.editor-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 220px;
}

.cm-editor-container {
  height: 220px;
  overflow: auto;
}

.cm-editor-container :deep(.cm-editor) {
  height: 100%;
}

.cm-editor-container :deep(.cm-scroller) {
  height: 100%;
  overflow: auto;
}
</style>
