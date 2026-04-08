<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlateGeneratorStore } from '@/stores/plateGenerator'
import { storeToRefs } from 'pinia'
import BiInfoCircle from 'bootstrap-icons/icons/info-circle.svg'
import Plate3DPreview from './Plate3DPreview.vue'
import PlateJscadPreview from './PlateJscadPreview.vue'

const plateStore = usePlateGeneratorStore()
const { generationState } = storeToRefs(plateStore)

const activeTab = ref<'2d' | '3d' | 'jscad'>('2d')

const isLoading = computed(
  () => generationState.value.status === 'loading' || generationState.value.status === 'generating',
)

const isSuccess = computed(() => generationState.value.status === 'success')

const isIdle = computed(() => generationState.value.status === 'idle')

const isRegenerating = computed(
  () => generationState.value.status === 'generating' && generationState.value.result != null,
)

const result = computed(() => generationState.value.result)

const showResults = computed(() => (isSuccess.value || isRegenerating.value) && result.value)

const hasJscad = computed(() => !!result.value?.jscadScript)
</script>

<template>
  <div class="plate-generator-results">
    <!-- Tab bar (only when results available) -->
    <div v-if="showResults" class="tab-bar">
      <button
        class="tab-bar-item"
        :class="{ active: activeTab === '2d' }"
        @click="activeTab = '2d'"
      >
        2D
      </button>
      <button
        class="tab-bar-item"
        :class="{ active: activeTab === '3d' }"
        @click="activeTab = '3d'"
      >
        3D
      </button>
      <button
        v-if="hasJscad"
        class="tab-bar-item"
        :class="{ active: activeTab === 'jscad' }"
        @click="activeTab = 'jscad'"
      >
        JSCAD
      </button>
    </div>

    <!-- Loading State (first run only, no previous result) -->
    <div v-if="isLoading && !isRegenerating" class="loading-wrapper">
      <p class="text-muted mt-3 text-center">
        {{ generationState.status === 'loading' ? 'Loading library...' : 'Generating plate...' }}
      </p>
    </div>

    <!-- Results shown when successful OR regenerating with previous result -->
    <template v-else-if="showResults">
      <!-- 2D Tab: SVG preview -->
      <div
        v-show="activeTab === '2d'"
        class="svg-preview-container"
        :class="{ regenerating: isRegenerating }"
      >
        <div v-if="isRegenerating" class="regenerating-overlay">
          <p class="text-muted small mb-0">Generating plate...</p>
        </div>
        <div v-html="result!.svgPreview"></div>
      </div>

      <!-- 3D Tab: viewer -->
      <div v-show="activeTab === '3d'" class="tab-3d-container">
        <Plate3DPreview
          :stlData="result?.stlData"
          :generating="isRegenerating"
          :visible="activeTab === '3d'"
        />
      </div>

      <!-- JSCAD Tab: read-only code preview -->
      <div v-if="hasJscad" v-show="activeTab === 'jscad'" class="tab-jscad-container">
        <PlateJscadPreview :jscadScript="result?.jscadScript" :visible="activeTab === 'jscad'" />
      </div>
    </template>

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

/* Segmented tab bar matching PlateGeneratorPanel style */
.tab-bar {
  display: flex;
  background-color: var(--bs-secondary-bg);
  border-radius: 5px;
  padding: 3px;
  gap: 2px;
  margin-bottom: 8px;
  flex-shrink: 0;
  width: fit-content;
}

.tab-bar-item {
  padding: 0.25rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--bs-secondary-color);
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
}

.tab-bar-item:hover:not(.active) {
  color: var(--bs-body-color);
  background-color: var(--bs-tertiary-bg);
}

.tab-bar-item.active {
  color: var(--bs-body-color);
  background-color: var(--bs-body-bg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
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

/* 3D tab layout */
.tab-3d-container {
  flex-grow: 1;
  min-height: 250px;
  overflow: hidden;
}

/* JSCAD tab layout */
.tab-jscad-container {
  flex-grow: 1;
  min-height: 250px;
  overflow: hidden;
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
