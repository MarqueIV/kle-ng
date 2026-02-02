<script setup lang="ts">
import { computed } from 'vue'
import { usePlateGeneratorStore } from '@/stores/plateGenerator'
import { storeToRefs } from 'pinia'
import BiInfoCircle from 'bootstrap-icons/icons/info-circle.svg'

const plateStore = usePlateGeneratorStore()
const { generationState } = storeToRefs(plateStore)

const isLoading = computed(
  () => generationState.value.status === 'loading' || generationState.value.status === 'generating',
)

const isSuccess = computed(() => generationState.value.status === 'success')

const isIdle = computed(() => generationState.value.status === 'idle')

const result = computed(() => generationState.value.result)

// Format dimensions for display
const dimensionsText = computed(() => {
  if (!result.value) return ''
  const { width, height } = result.value.boundingBox
  return `${width.toFixed(1)}mm x ${height.toFixed(1)}mm`
})

const cutoutCountText = computed(() => {
  if (!result.value) return ''
  const count = result.value.cutoutCount
  return `${count} cutout${count !== 1 ? 's' : ''}`
})
</script>

<template>
  <div class="plate-generator-results">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-wrapper">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="text-muted mt-3 text-center">
        {{ generationState.status === 'loading' ? 'Loading library...' : 'Generating plate...' }}
      </p>
    </div>

    <!-- Success State with SVG Preview -->
    <div v-else-if="isSuccess && result" class="success-wrapper">
      <div class="svg-preview-container">
        <!-- Inline SVG Preview -->
        <div class="svg-preview" v-html="result.svgContent"></div>
      </div>
      <!-- Dimensions Info -->
      <div class="dimensions-info mt-2 text-center">
        <span class="badge bg-secondary me-2">{{ dimensionsText }}</span>
        <span class="badge bg-secondary">{{ cutoutCountText }}</span>
      </div>
    </div>

    <!-- Idle State -->
    <div v-else-if="isIdle" class="idle-wrapper">
      <BiInfoCircle class="text-muted mb-2" />
      <p class="text-muted small text-center mb-0">
        Click "Generate Plate" to create switch cutouts from your keyboard layout.
      </p>
    </div>
  </div>
</template>

<style scoped>
.plate-generator-results {
  padding: 0;
  width: 100%;
  height: 100%;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.success-wrapper {
  width: 100%;
  padding: 1rem;
}

.svg-preview-container {
  width: 100%;
  max-height: 400px;
  overflow: auto;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  background: var(--bs-body-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.svg-preview {
  max-width: 100%;
  height: auto;
}

/* Style the generated SVG */
.svg-preview :deep(svg) {
  max-width: 100%;
  height: auto;
  display: block;
}

.dimensions-info {
  padding: 0.5rem 0;
}

.idle-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--bs-secondary-color);
}

.idle-wrapper svg {
  width: 32px;
  height: 32px;
}
</style>
