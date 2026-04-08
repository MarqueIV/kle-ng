<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { preloadMakerJsModule } from '@/utils/makerjs-loader'
import { preloadThreeModule } from '@/utils/three-loader'
import PlateGeneratorSettings from './PlateGeneratorSettings.vue'
import PlateOutlineSettings from './PlateOutlineSettings.vue'
import PlateHolesSettings from './PlateHolesSettings.vue'
import PlateGeneratorControls from './PlateGeneratorControls.vue'
import PlateGeneratorResults from './PlateGeneratorResults.vue'
import PlateDownloadButtons from './PlateDownloadButtons.vue'

type TabId = 'cutouts' | 'outline' | 'holes'
const activeTab = ref<TabId>('cutouts')

// Preload maker.js and Three.js when component mounts
onMounted(() => {
  preloadMakerJsModule()
  preloadThreeModule()
})
</script>

<template>
  <div class="plate-generator-panel">
    <!-- Two Column Layout: Controls | Output -->
    <div class="row g-3">
      <!-- Left Column: Tabbed Controls -->
      <div class="col-lg-4 settings-column">
        <!-- Settings Card -->
        <div class="settings-card">
          <!-- Tab Bar -->
          <div class="tab-bar">
            <button
              class="tab-bar-item"
              :class="{ active: activeTab === 'cutouts' }"
              @click="activeTab = 'cutouts'"
            >
              Switch Cutouts
            </button>
            <button
              class="tab-bar-item"
              :class="{ active: activeTab === 'holes' }"
              @click="activeTab = 'holes'"
            >
              Holes
            </button>
            <button
              class="tab-bar-item"
              :class="{ active: activeTab === 'outline' }"
              @click="activeTab = 'outline'"
              data-testid="plate-tab-outline"
            >
              Outline
            </button>
          </div>

          <!-- Tab Content - Grid stacks all panes to maintain max height -->
          <div class="tab-content-grid">
            <!-- Cutouts Tab -->
            <div class="tab-pane-content" :class="{ 'tab-pane-hidden': activeTab !== 'cutouts' }">
              <PlateGeneratorSettings />
            </div>

            <!-- Holes Tab -->
            <div class="tab-pane-content" :class="{ 'tab-pane-hidden': activeTab !== 'holes' }">
              <PlateHolesSettings />
            </div>

            <!-- Outline Tab -->
            <div class="tab-pane-content" :class="{ 'tab-pane-hidden': activeTab !== 'outline' }">
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
      <div class="col-lg-8 results-column">
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

.settings-column {
  max-width: 500px;
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

@media (max-width: 991.98px) {
  .settings-column {
    max-width: none;
  }

  .results-card {
    position: static;
    min-height: 300px;
  }
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

/* CSS Grid stacks both tab panes in same cell - height is max of both */
.tab-content-grid {
  display: grid;
}

.tab-pane-content {
  grid-column: 1;
  grid-row: 1;
}

.tab-pane-hidden {
  opacity: 0;
  pointer-events: none;
}
</style>
