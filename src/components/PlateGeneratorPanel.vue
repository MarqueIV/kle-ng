<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { preloadMakerJsModule } from '@/utils/makerjs-loader'
import PlateGeneratorSettings from './PlateGeneratorSettings.vue'
import PlateOutlineSettings from './PlateOutlineSettings.vue'
import PlateGeneratorControls from './PlateGeneratorControls.vue'
import PlateGeneratorResults from './PlateGeneratorResults.vue'
import PlateDownloadButtons from './PlateDownloadButtons.vue'

type TabId = 'cutouts' | 'outline'
const activeTab = ref<TabId>('cutouts')

// Preload maker.js when component mounts
onMounted(() => {
  preloadMakerJsModule()
})
</script>

<template>
  <div class="plate-generator-panel">
    <!-- Two Column Layout: Controls | Output -->
    <div class="row g-3">
      <!-- Left Column: Tabbed Controls -->
      <div class="col-md-4" style="max-width: 500px">
        <!-- Settings Card -->
        <div class="settings-card">
          <!-- Tab Bar -->
          <div class="tab-bar">
            <button
              class="tab-bar-item"
              :class="{ active: activeTab === 'cutouts' }"
              @click="activeTab = 'cutouts'"
            >
              Cutouts
            </button>
            <button
              class="tab-bar-item"
              :class="{ active: activeTab === 'outline' }"
              @click="activeTab = 'outline'"
            >
              Outline
            </button>
          </div>

          <!-- Tab Content -->
          <div class="tab-content">
            <!-- Cutouts Tab -->
            <div v-show="activeTab === 'cutouts'" class="tab-pane-content">
              <PlateGeneratorSettings />
            </div>

            <!-- Outline Tab -->
            <div v-show="activeTab === 'outline'" class="tab-pane-content">
              <PlateOutlineSettings />
            </div>
          </div>
        </div>

        <!-- Controls Card (always visible below settings) -->
        <div class="controls-card">
          <PlateGeneratorControls />
          <PlateDownloadButtons />
        </div>
      </div>

      <!-- Right Column: All Output -->
      <div class="col-md-8 results-column">
        <div class="results-card">
          <PlateGeneratorResults />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plate-generator-panel {
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

/* Card styling matching Key Properties panel */
.settings-card,
.controls-card,
.results-card {
  background: var(--bs-tertiary-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 6px;
  padding: 12px;
}

.settings-card {
  margin-bottom: 12px;
}

.controls-card {
  padding: 10px 12px;
}

.results-column {
  position: relative;
}

.results-card {
  position: absolute;
  top: 0;
  left: calc(var(--bs-gutter-x) * 0.5);
  right: calc(var(--bs-gutter-x) * 0.5);
  bottom: 0;
  display: flex;
  flex-direction: column;
  min-height: 300px;
}

/* Segmented tab bar */
.tab-bar {
  display: flex;
  background-color: var(--bs-secondary-bg);
  border-radius: 5px;
  padding: 3px;
  gap: 2px;
  margin-bottom: 12px;
}

.tab-bar-item {
  flex: 1;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
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

.tab-content {
  min-height: 0;
}

.tab-pane-content {
  height: 100%;
}
</style>
