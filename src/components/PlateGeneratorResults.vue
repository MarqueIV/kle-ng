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
    <div
      v-else-if="isSuccess && result"
      class="svg-preview-container"
      v-html="result.svgPreview"
    ></div>

    <!-- Idle State -->
    <div v-else-if="isIdle" class="idle-wrapper">
      <BiInfoCircle class="mb-2" />
      <p class="small text-center mb-0">
        Click "Generate" to create switch cutouts and outlines from your keyboard layout.
      </p>
    </div>
  </div>
</template>

<style scoped>
.plate-generator-results {
  width: 100%;
  min-height: 250px;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  min-height: 250px;
}

/* SVG preview container - fixed height like reference project */
.svg-preview-container {
  height: 30vh;
  min-height: 250px;
  padding: 1rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  background: var(--bs-tertiary-bg);
}

/* SVG fills container and maintains aspect ratio via viewBox */
.svg-preview-container :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.idle-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  min-height: 250px;
  color: var(--bs-secondary-color);
}

.idle-wrapper svg {
  width: 32px;
  height: 32px;
}
</style>
