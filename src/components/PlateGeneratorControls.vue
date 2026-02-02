<script setup lang="ts">
import { computed } from 'vue'
import { usePlateGeneratorStore } from '@/stores/plateGenerator'
import { useKeyboardStore } from '@/stores/keyboard'
import { storeToRefs } from 'pinia'

const plateStore = usePlateGeneratorStore()
const { generationState } = storeToRefs(plateStore)

const keyboardStore = useKeyboardStore()

// Check if we have keys to generate from
const hasKeys = computed(() => keyboardStore.keys.length > 0)

// Button state
const isLoading = computed(
  () => generationState.value.status === 'loading' || generationState.value.status === 'generating',
)

const isGenerateDisabled = computed(() => isLoading.value || !hasKeys.value)

const buttonTooltip = computed(() => {
  if (!hasKeys.value) {
    return 'Layout is empty. Add keys to generate a plate.'
  }
  if (isLoading.value) {
    return 'Generation in progress...'
  }
  return 'Generate plate cutouts from current layout'
})

const statusMessage = computed(() => {
  switch (generationState.value.status) {
    case 'loading':
      return 'Loading plate generation library...'
    case 'generating':
      return 'Generating plate...'
    default:
      return ''
  }
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
    <div class="d-grid gap-2">
      <button
        type="button"
        class="btn btn-primary btn-sm"
        :disabled="isGenerateDisabled"
        @click="handleGeneratePlate"
        :title="buttonTooltip"
      >
        <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status">
          <span class="visually-hidden">Loading...</span>
        </span>
        Generate Plate
      </button>
    </div>

    <!-- Status Message -->
    <div v-if="isLoading" class="text-muted small mt-2 text-center">
      {{ statusMessage }}
    </div>

    <!-- Empty Layout Warning -->
    <div v-if="!hasKeys" class="alert alert-warning py-2 mt-2 mb-0" role="alert">
      <small> Layout is empty. Add keys to your layout before generating a plate. </small>
    </div>
  </div>
</template>

<style scoped>
.plate-generator-controls {
  padding: 0;
  margin-top: 1rem;
}

.btn-primary:disabled {
  cursor: not-allowed !important;
  pointer-events: auto !important;
}
</style>
