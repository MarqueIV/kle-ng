<script setup lang="ts">
import { computed } from 'vue'
import { usePlateGeneratorStore } from '@/stores/plateGenerator'
import { storeToRefs } from 'pinia'
import {
  getCutoutOptions,
  getCutoutGenerator,
  validateFilletRadius,
} from '@/utils/plate/cutout-generator'
import CustomNumberInput from './CustomNumberInput.vue'

const plateStore = usePlateGeneratorStore()
const { settings } = storeToRefs(plateStore)

// Get cutout options for dropdown
const cutoutOptions = getCutoutOptions()

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

      <!-- Fillet Radius -->
      <div class="mb-2">
        <label for="filletRadius" class="form-label form-label-sm">Fillet Radius</label>
        <CustomNumberInput
          id="filletRadius"
          v-model="settings.filletRadius"
          :step="0.5"
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
