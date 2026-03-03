<script setup lang="ts">
import { computed } from 'vue'
import { usePlateGeneratorStore } from '@/stores/plateGenerator'
import { storeToRefs } from 'pinia'
import BiDownload from 'bootstrap-icons/icons/download.svg'

const plateStore = usePlateGeneratorStore()
const { generationState } = storeToRefs(plateStore)

const isSuccess = computed(() => generationState.value.status === 'success')
const isGenerating = computed(() => generationState.value.status === 'generating')

const hasResult = computed(() => generationState.value.result !== null)

const showButtons = computed(() => (isSuccess.value && hasResult.value) || isGenerating.value)

const result = computed(() => generationState.value.result)

function handleDownloadSvg() {
  plateStore.downloadAllSvg()
}

function handleDownloadDxf() {
  plateStore.downloadAllDxf()
}
</script>

<template>
  <div class="plate-download-buttons">
    <div v-if="showButtons" class="buttons-grid" style="margin-top: 1rem">
      <button
        type="button"
        class="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center gap-2"
        @click="handleDownloadSvg"
        :disabled="isGenerating"
        aria-label="Download plate as SVG file"
        title="Download SVG for use in vector editors like Inkscape or Adobe Illustrator"
      >
        <BiDownload aria-hidden="true" />
        Download SVG
      </button>
      <button
        type="button"
        class="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center gap-2"
        @click="handleDownloadDxf"
        :disabled="isGenerating"
        aria-label="Download plate as DXF file"
        title="Download DXF for use in CAD software or laser cutting services (units: millimeters)"
      >
        <BiDownload aria-hidden="true" />
        Download DXF
      </button>
      <button
        v-if="result?.stlData"
        type="button"
        class="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center gap-2"
        @click="plateStore.downloadStl()"
        :disabled="isGenerating"
        aria-label="Download plate as STL file"
        title="Download STL for 3D printing (requires Outline enabled)"
      >
        <BiDownload aria-hidden="true" />
        Download STL
      </button>
      <button
        v-if="result?.jscadScript"
        type="button"
        class="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center gap-2"
        @click="plateStore.downloadJscad()"
        :disabled="isGenerating"
        aria-label="Download plate as JSCAD script"
        title="Download JSCAD script for OpenJSCAD (requires Outline enabled)"
      >
        <BiDownload aria-hidden="true" />
        Download JSCAD
      </button>
    </div>
  </div>
</template>

<style scoped>
.plate-download-buttons {
  padding: 0;
}

.buttons-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
</style>
