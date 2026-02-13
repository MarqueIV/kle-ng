<script setup lang="ts">
import { computed } from 'vue'
import { usePlateGeneratorStore } from '@/stores/plateGenerator'
import { useKeyboardStore } from '@/stores/keyboard'
import { storeToRefs } from 'pinia'

const plateStore = usePlateGeneratorStore()
const { generationState, autoRefresh } = storeToRefs(plateStore)

const keyboardStore = useKeyboardStore()

// Check if we have keys to generate from
const hasKeys = computed(() => keyboardStore.keys.length > 0)

// Button state
const isLoading = computed(
  () => generationState.value.status === 'loading' || generationState.value.status === 'generating',
)

const isGenerateDisabled = computed(() => isLoading.value || !hasKeys.value || autoRefresh.value)

const buttonTooltip = computed(() => {
  if (!hasKeys.value) {
    return 'Layout is empty. Add keys to generate a plate.'
  }
  if (isLoading.value) {
    return 'Generation in progress...'
  }
  if (autoRefresh.value) {
    return 'Auto Refresh is enabled. Plate regenerates automatically on layout changes.'
  }
  return 'Generate plate cutouts from current layout'
})

async function handleGeneratePlate() {
  await plateStore.generatePlate()
}

function handleDismissError() {
  plateStore.resetGeneration()
}
</script>

<template>
  <div class="plate-generator-controls">
    <!-- Error Alert -->
    <div
      v-if="generationState.status === 'error'"
      class="alert alert-danger alert-dismissible py-2 mb-2"
      role="alert"
    >
      <small>{{ generationState.error }}</small>
      <button
        type="button"
        class="btn-close btn-close-sm"
        aria-label="Close"
        @click="handleDismissError"
      ></button>
    </div>

    <!-- Control Buttons -->
    <div class="d-flex align-items-center gap-2">
      <button
        type="button"
        class="btn btn-primary btn-sm flex-fill"
        :disabled="isGenerateDisabled"
        @click="handleGeneratePlate"
        :title="buttonTooltip"
      >
        <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status">
          <span class="visually-hidden">Loading...</span>
        </span>
        Generate
      </button>
      <div
        class="form-check form-check-inline flex-fill mb-0"
        title="Automatically regenerate plate when the layout changes"
      >
        <input
          id="plateAutoRefresh"
          v-model="autoRefresh"
          class="form-check-input"
          type="checkbox"
        />
        <label class="form-check-label small" for="plateAutoRefresh">Auto Refresh</label>
      </div>
    </div>

    <!-- Empty Layout Warning -->
    <div v-if="!hasKeys && !autoRefresh" class="alert alert-warning py-2 mt-2 mb-0" role="alert">
      <small> Layout is empty. Add keys to your layout before generating a plate. </small>
    </div>
  </div>
</template>

<style scoped>
.plate-generator-controls {
  padding: 0;
}

.btn-primary:disabled {
  cursor: not-allowed !important;
  pointer-events: auto !important;
}
</style>
