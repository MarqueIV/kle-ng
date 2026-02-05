<script setup lang="ts">
import { usePlateGeneratorStore } from '@/stores/plateGenerator'
import { storeToRefs } from 'pinia'
import CustomNumberInput from './CustomNumberInput.vue'

const plateStore = usePlateGeneratorStore()
const { settings } = storeToRefs(plateStore)
</script>

<template>
  <div class="plate-holes-settings">
    <div class="settings-section">
      <!-- Corner Mounting Holes -->
      <div class="mb-2">
        <div class="form-check">
          <input
            id="enableMountingHoles"
            v-model="settings.mountingHoles.enabled"
            class="form-check-input"
            type="checkbox"
            :disabled="!settings.outline.enabled"
          />
          <label class="form-check-label form-label-sm" for="enableMountingHoles"
            >Corner Mounting Holes</label
          >
        </div>
        <div class="form-text small">Add circular holes at each corner of the outline</div>
      </div>

      <!-- Mounting Hole Settings -->
      <div class="mb-2">
        <div class="holes-grid">
          <div class="hole-input">
            <label for="mountingHoleDiameter" class="form-label form-label-sm sub-label"
              >Diameter</label
            >
            <CustomNumberInput
              id="mountingHoleDiameter"
              v-model="settings.mountingHoles.diameter"
              :step="0.5"
              :min="0.5"
              :disabled="!settings.outline.enabled || !settings.mountingHoles.enabled"
              class="form-control form-control-sm"
              size="default"
              title="Mounting hole diameter in millimeters"
            >
              <template #suffix>mm</template>
            </CustomNumberInput>
          </div>
          <div class="hole-input">
            <label for="mountingHoleEdgeDistance" class="form-label form-label-sm sub-label"
              >Edge Distance</label
            >
            <CustomNumberInput
              id="mountingHoleEdgeDistance"
              v-model="settings.mountingHoles.edgeDistance"
              :step="0.5"
              :min="0.5"
              :disabled="!settings.outline.enabled || !settings.mountingHoles.enabled"
              class="form-control form-control-sm"
              size="default"
              title="Distance from outline edge to hole center in millimeters"
            >
              <template #suffix>mm</template>
            </CustomNumberInput>
          </div>
        </div>
        <div class="form-text small">Requires outline to be enabled (for corner positions)</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plate-holes-settings {
  padding: 0;
}

.form-label-sm {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.settings-section {
  padding-top: 0;
  padding-bottom: 0;
}

.holes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.hole-input {
  display: flex;
  flex-direction: column;
}

.sub-label {
  font-weight: 400;
  font-size: 0.8rem;
  margin-bottom: 0.1rem;
}

/* Ensure consistent spacing */
.mb-2:last-child {
  margin-bottom: 0 !important;
}
</style>
