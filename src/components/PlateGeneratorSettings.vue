<script setup lang="ts">
import { computed } from 'vue'
import { usePlateGeneratorStore } from '@/stores/plateGenerator'
import { storeToRefs } from 'pinia'
import {
  getCutoutOptions,
  getStabilizerOptions,
  getCutoutGenerator,
  validateFilletRadius,
  validateSizeAdjust,
} from '@/utils/plate/cutout-generator'
import CustomNumberInput from './CustomNumberInput.vue'

const plateStore = usePlateGeneratorStore()
const { settings } = storeToRefs(plateStore)

// Get cutout options for dropdown
const cutoutOptions = getCutoutOptions()

// Get stabilizer options for dropdown
const stabilizerOptions = getStabilizerOptions()

// Fillet radius validation
const filletError = computed(() =>
  validateFilletRadius(settings.value.cutoutType, settings.value.filletRadius),
)

const maxFilletRadius = computed(
  () => getCutoutGenerator(settings.value.cutoutType).maxFilletRadius,
)

const filletInputClass = computed(() =>
  filletError.value ? 'form-control form-control-sm is-invalid' : 'form-control form-control-sm',
)

// Size adjustment validation
const sizeAdjustError = computed(() =>
  validateSizeAdjust(settings.value.cutoutType, settings.value.sizeAdjust),
)

const sizeAdjustInputClass = computed(() =>
  sizeAdjustError.value
    ? 'form-control form-control-sm is-invalid'
    : 'form-control form-control-sm',
)
</script>

<template>
  <div class="plate-generator-settings">
    <!-- Cutout Configuration Section -->
    <div class="settings-section">
      <div class="section-title">Cutout Configuration</div>

      <!-- Cutout Type -->
      <div class="mb-2">
        <label for="cutoutType" class="form-label form-label-sm">Switch Cutout Type</label>
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

      <!-- Stabilizer Type -->
      <div class="mb-2">
        <label for="stabilizerType" class="form-label form-label-sm">Stabilizer Cutout Type</label>
        <select
          id="stabilizerType"
          v-model="settings.stabilizerType"
          class="form-select form-select-sm"
          aria-label="Select stabilizer cutout type"
        >
          <option v-for="option in stabilizerOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <div class="form-text small">
          {{ stabilizerOptions.find((o) => o.value === settings.stabilizerType)?.description }}
        </div>
      </div>

      <!-- Fillet Radius -->
      <div class="mb-2">
        <label for="filletRadius" class="form-label form-label-sm">Fillet Radius</label>
        <CustomNumberInput
          id="filletRadius"
          v-model="settings.filletRadius"
          :step="0.01"
          :min="0"
          :max="maxFilletRadius"
          :class="filletInputClass"
          size="default"
          title="Corner rounding radius in millimeters"
        >
          <template #suffix>mm</template>
        </CustomNumberInput>
        <div v-if="filletError" class="invalid-feedback d-block">
          {{ filletError }}
        </div>
        <div v-else class="form-text small">
          Corner rounding for cutouts (0 = sharp corners, max {{ maxFilletRadius }}mm)
        </div>
      </div>

      <!-- Size Adjustment -->
      <div class="mb-2">
        <label for="sizeAdjust" class="form-label form-label-sm">Size Adjustment</label>
        <CustomNumberInput
          id="sizeAdjust"
          v-model="settings.sizeAdjust"
          :step="0.001"
          :class="sizeAdjustInputClass"
          size="default"
          title="Cutout size adjustment in millimeters"
        >
          <template #suffix>mm</template>
        </CustomNumberInput>
        <div v-if="sizeAdjustError" class="invalid-feedback d-block">
          {{ sizeAdjustError }}
        </div>
        <div v-else class="form-text small">Positive = shrink, negative = expand</div>
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
