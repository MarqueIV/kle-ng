<script setup lang="ts">
import { usePlateGeneratorStore } from '@/stores/plateGenerator'
import { storeToRefs } from 'pinia'
import { getCutoutOptions } from '@/utils/plate/cutout-generator'

const plateStore = usePlateGeneratorStore()
const { settings } = storeToRefs(plateStore)

// Get cutout options for dropdown
const cutoutOptions = getCutoutOptions()
</script>

<template>
  <div class="plate-generator-settings">
    <!-- Cutout Configuration Section -->
    <div class="settings-section">
      <div class="section-title">Cutout Configuration</div>

      <!-- Cutout Type -->
      <div class="mb-2">
        <label for="cutoutType" class="form-label form-label-sm">Cutout Type</label>
        <select
          id="cutoutType"
          v-model="settings.cutoutType"
          class="form-select form-select-sm"
          aria-label="Select switch cutout type"
        >
          <option v-for="option in cutoutOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <div class="form-text small">
          {{ cutoutOptions.find((o) => o.value === settings.cutoutType)?.description }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plate-generator-settings {
  padding: 0;
}

.form-label-sm {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.settings-section {
  padding-top: 0;
  padding-bottom: 0.5rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--bs-emphasis-color);
}

/* Ensure consistent spacing */
.mb-2:last-child {
  margin-bottom: 0 !important;
}
</style>
