<script setup lang="ts">
import { computed } from 'vue'
import { usePlateGeneratorStore } from '@/stores/plateGenerator'
import { storeToRefs } from 'pinia'
import BiDownload from 'bootstrap-icons/icons/download.svg'

const plateStore = usePlateGeneratorStore()
const { generationState } = storeToRefs(plateStore)

const isSuccess = computed(() => generationState.value.status === 'success')
const hasResult = computed(() => generationState.value.result !== null)

const showButtons = computed(() => isSuccess.value && hasResult.value)

function handleDownloadSvg() {
  plateStore.downloadAllSvg()
}

function handleDownloadDxf() {
  plateStore.downloadAllDxf()
}
</script>

<template>
  <div class="plate-download-buttons">
    <div v-if="showButtons" class="d-flex gap-2">
      <button
        type="button"
        class="btn btn-sm btn-outline-primary flex-fill d-flex align-items-center justify-content-center gap-2"
        @click="handleDownloadSvg"
        aria-label="Download plate as SVG file"
        title="Download SVG for use in vector editors like Inkscape or Adobe Illustrator"
      >
        <BiDownload aria-hidden="true" />
        Download SVG
      </button>
      <button
        type="button"
        class="btn btn-sm btn-outline-primary flex-fill d-flex align-items-center justify-content-center gap-2"
        @click="handleDownloadDxf"
        aria-label="Download plate as DXF file"
        title="Download DXF for use in CAD software or laser cutting services (units: millimeters)"
      >
        <BiDownload aria-hidden="true" />
        Download DXF
      </button>
    </div>
  </div>
</template>

<style scoped>
.plate-download-buttons {
  padding: 0;
  margin-top: 1.5rem;
}
</style>
