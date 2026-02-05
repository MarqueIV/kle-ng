<script setup lang="ts">
import { usePlateGeneratorStore } from '@/stores/plateGenerator'
import { storeToRefs } from 'pinia'
import CustomNumberInput from './CustomNumberInput.vue'

const plateStore = usePlateGeneratorStore()
const { settings } = storeToRefs(plateStore)
</script>

<template>
  <div class="plate-outline-settings">
    <div class="settings-section">
      <!-- Enable Outline -->
      <div class="mb-2">
        <div class="form-check">
          <input
            id="enableOutline"
            v-model="settings.outline.enabled"
            class="form-check-input"
            type="checkbox"
          />
          <label class="form-check-label form-label-sm" for="enableOutline">Enable Outline</label>
        </div>
        <div class="form-text small">Generate a rectangular outline around all cutouts</div>
      </div>

      <!-- Merge with Cutouts -->
      <div class="mb-2">
        <div class="form-check">
          <input
            id="mergeWithCutouts"
            v-model="settings.outline.mergeWithCutouts"
            class="form-check-input"
            type="checkbox"
            :disabled="!settings.outline.enabled"
          />
          <label class="form-check-label form-label-sm" for="mergeWithCutouts"
            >Merge with Cutouts</label
          >
        </div>
        <div class="form-text small">Download outline and cutouts as a single file</div>
      </div>

      <!-- Margins -->
      <div class="mb-2">
        <label class="form-label form-label-sm">Margins</label>
        <div class="margins-grid">
          <div class="margin-input">
            <label for="marginTop" class="form-label form-label-sm margin-sub-label">Top</label>
            <CustomNumberInput
              id="marginTop"
              v-model="settings.outline.marginTop"
              :step="0.5"
              :min="0"
              :disabled="!settings.outline.enabled"
              class="form-control form-control-sm"
              size="default"
              title="Top margin in millimeters"
            >
              <template #suffix>mm</template>
            </CustomNumberInput>
          </div>
          <div class="margin-input">
            <label for="marginBottom" class="form-label form-label-sm margin-sub-label"
              >Bottom</label
            >
            <CustomNumberInput
              id="marginBottom"
              v-model="settings.outline.marginBottom"
              :step="0.5"
              :min="0"
              :disabled="!settings.outline.enabled"
              class="form-control form-control-sm"
              size="default"
              title="Bottom margin in millimeters"
            >
              <template #suffix>mm</template>
            </CustomNumberInput>
          </div>
          <div class="margin-input">
            <label for="marginLeft" class="form-label form-label-sm margin-sub-label">Left</label>
            <CustomNumberInput
              id="marginLeft"
              v-model="settings.outline.marginLeft"
              :step="0.5"
              :min="0"
              :disabled="!settings.outline.enabled"
              class="form-control form-control-sm"
              size="default"
              title="Left margin in millimeters"
            >
              <template #suffix>mm</template>
            </CustomNumberInput>
          </div>
          <div class="margin-input">
            <label for="marginRight" class="form-label form-label-sm margin-sub-label">Right</label>
            <CustomNumberInput
              id="marginRight"
              v-model="settings.outline.marginRight"
              :step="0.5"
              :min="0"
              :disabled="!settings.outline.enabled"
              class="form-control form-control-sm"
              size="default"
              title="Right margin in millimeters"
            >
              <template #suffix>mm</template>
            </CustomNumberInput>
          </div>
        </div>
        <div class="form-text small">Distance from cutout bounds to outline edge</div>
      </div>

      <!-- Fillet Radius -->
      <div class="mb-2">
        <label for="outlineFilletRadius" class="form-label form-label-sm">Fillet Radius</label>
        <CustomNumberInput
          id="outlineFilletRadius"
          v-model="settings.outline.filletRadius"
          :step="0.5"
          :min="0"
          :disabled="!settings.outline.enabled"
          class="form-control form-control-sm"
          size="default"
          title="Corner rounding radius for outline in millimeters"
        >
          <template #suffix>mm</template>
        </CustomNumberInput>
        <div class="form-text small">Corner rounding radius (0 = sharp corners)</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plate-outline-settings {
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

.margins-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.margin-input {
  display: flex;
  flex-direction: column;
}

.margin-sub-label {
  font-weight: 400;
  font-size: 0.8rem;
  margin-bottom: 0.1rem;
}

/* Ensure consistent spacing */
.mb-2:last-child {
  margin-bottom: 0 !important;
}
</style>
