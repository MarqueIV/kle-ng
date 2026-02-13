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

const isRegenerating = computed(
  () => generationState.value.status === 'generating' && generationState.value.result != null,
)

const result = computed(() => generationState.value.result)
</script>

<template>
  <div class="plate-generator-results">
    <!-- Loading State (first run only, no previous result) -->
    <div v-if="isLoading && !isRegenerating" class="loading-wrapper">
      <p class="text-muted mt-3 text-center">
        {{ generationState.status === 'loading' ? 'Loading library...' : 'Generating plate...' }}
      </p>
    </div>

    <!-- SVG Preview (shown when successful OR regenerating with previous result) -->
    <div
      v-else-if="(isSuccess || isRegenerating) && result"
      class="svg-preview-container"
      :class="{ regenerating: isRegenerating }"
    >
      <div v-if="isRegenerating" class="regenerating-overlay">
        <p class="text-muted small mb-0">Generating plate...</p>
      </div>
      <div v-html="result.svgPreview"></div>
    </div>

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
  height: 100%;
  display: flex;
  flex-direction: column;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

/* SVG preview container - fills available height */
.svg-preview-container {
  flex-grow: 1;
  min-height: 250px;
  padding: 1rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  background: var(--bs-tertiary-bg);
  overflow: hidden;
}

.svg-preview-container > div:last-child {
  width: 100%;
  height: 100%;
}

.svg-preview-container.regenerating {
  position: relative;
}

.regenerating-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  text-align: center;
  z-index: 1;
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
  flex-grow: 1;
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
