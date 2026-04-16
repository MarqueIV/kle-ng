<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { preloadMakerJsModule } from '@/utils/makerjs-loader'
import { preloadThreeModule } from '@/utils/three-loader'
import PlateGeneratorSettings from './PlateGeneratorSettings.vue'
import PlateOutlineSettings from './PlateOutlineSettings.vue'
import PlateHolesSettings from './PlateHolesSettings.vue'
import PlateGeneratorControls from './PlateGeneratorControls.vue'
import PlateGeneratorResults from './PlateGeneratorResults.vue'
import PlateDownloadButtons from './PlateDownloadButtons.vue'
import BiChevronLeft from 'bootstrap-icons/icons/chevron-left.svg'
import BiChevronRight from 'bootstrap-icons/icons/chevron-right.svg'

const tabs = [
  { id: 'cutouts', label: 'Switch Cutouts' },
  { id: 'holes', label: 'Holes' },
  { id: 'outline', label: 'Outline' },
  { id: 'json', label: 'JSON' },
] as const

type TabId = (typeof tabs)[number]['id']

const VISIBLE_TABS = 3

const activeTab = ref<TabId>('cutouts')
const tabOffset = ref(0)
const tabTrackRef = ref<HTMLElement | null>(null)

const canGoPrev = computed(() => tabOffset.value > 0)
const canGoNext = computed(() => tabOffset.value + VISIBLE_TABS < tabs.length)

function scrollTrack(offset: number) {
  tabOffset.value = offset
  const el = tabTrackRef.value
  if (!el) return
  const tabWidth = el.offsetWidth / VISIBLE_TABS
  el.scrollTo({ left: offset * tabWidth, behavior: 'smooth' })
}

function selectTab(id: TabId) {
  activeTab.value = id
  const idx = tabs.findIndex((t) => t.id === id)
  if (idx < tabOffset.value) {
    scrollTrack(idx)
  } else if (idx >= tabOffset.value + VISIBLE_TABS) {
    scrollTrack(idx - VISIBLE_TABS + 1)
  }
}

function goPrev() {
  scrollTrack(Math.max(0, tabOffset.value - 1))
}

function goNext() {
  scrollTrack(Math.min(tabs.length - VISIBLE_TABS, tabOffset.value + 1))
}

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
              class="tab-nav-btn"
              :class="{ 'tab-nav-btn--hidden': !canGoPrev }"
              :disabled="!canGoPrev"
              aria-label="Previous tabs"
              @click="goPrev"
            >
              <BiChevronLeft />
            </button>

            <div class="tab-track-wrapper">
              <div ref="tabTrackRef" class="tab-track">
                <button
                  v-for="tab in tabs"
                  :key="tab.id"
                  class="tab-bar-item"
                  :class="{ active: activeTab === tab.id }"
                  :data-testid="tab.id === 'outline' ? 'plate-tab-outline' : undefined"
                  @click="selectTab(tab.id)"
                >
                  {{ tab.label }}
                </button>
              </div>
            </div>

            <button
              class="tab-nav-btn"
              :class="{ 'tab-nav-btn--hidden': !canGoNext }"
              :disabled="!canGoNext"
              aria-label="Next tabs"
              @click="goNext"
            >
              <BiChevronRight />
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

            <!-- JSON Tab -->
            <div
              class="tab-pane-content"
              :class="{ 'tab-pane-hidden': activeTab !== 'json' }"
            ></div>
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
  align-items: center;
  background-color: var(--bs-secondary-bg);
  border-radius: 6px;
  padding: 3px;
  gap: 2px;
  margin-bottom: 12px;
}

/* Scrollable track that clips overflow */
.tab-track-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}



/* Inner scrollable row — overflow hidden, scrolled via JS */
.tab-track {
  display: flex;
  overflow: hidden;
}

.tab-bar-item {
  flex: 0 0 calc(100% / 3);
  min-width: 0;
  padding: 0.35rem 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  line-height: 1.2;
  color: var(--bs-secondary-color);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
}

.tab-bar-item:hover:not(.active) {
  color: var(--bs-body-color);
  background-color: color-mix(in srgb, var(--bs-tertiary-bg) 80%, var(--bs-body-color) 5%);
}

.tab-bar-item.active {
  color: var(--bs-body-color);
  background-color: var(--bs-body-bg);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.04);
}

/* Nav arrow buttons */
.tab-nav-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  color: var(--bs-secondary-color);
  background: var(--bs-tertiary-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 4px;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    opacity 0.2s ease;
}

.tab-nav-btn :deep(svg) {
  width: 0.8rem;
  height: 0.8rem;
  display: block;
  fill: currentColor;
}

.tab-nav-btn:hover:not(:disabled) {
  color: var(--bs-body-color);
  background-color: var(--bs-body-bg);
  border-color: var(--bs-border-color-translucent);
}

.tab-nav-btn--hidden {
  opacity: 0;
  pointer-events: none;
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
