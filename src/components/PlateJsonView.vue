<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { ref } from 'vue'
import { usePlateGeneratorStore } from '@/stores/plateGenerator'
import { getCodeMirror } from '@/utils/codemirror-loader'
import type { EditorView } from '@codemirror/view'

const plateStore = usePlateGeneratorStore()

const editorContainer = ref<HTMLDivElement>()
const editorReady = ref(false)
const loadError = ref(false)

let editorView: EditorView | null = null
let themeObserver: MutationObserver | null = null

function getTheme(): 'dark' | 'light' {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light'
}

function getContent(): string {
  return JSON.stringify(plateStore.settings, null, 2)
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

  editorView = cm.createJsonEditor(editorContainer.value, getContent(), getTheme(), {
    onChange: () => {},
    readOnly: true,
  })
}

watch(
  () => plateStore.settings,
  () => {
    if (!editorView) return
    getCodeMirror()
      .then((cm) => {
        if (editorView) cm.updateContent(editorView, getContent())
      })
      .catch((err) => console.error('Failed to update plate JSON view:', err))
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

<template>
  <div class="json-view plate-json-view">
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
</template>

<style scoped>
.json-view {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  overflow: hidden;
}

.editor-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.cm-editor-container {
  height: 300px;
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
