<script setup lang="ts">
import { onUnmounted } from 'vue'
import { usePcbGeneratorStore } from '@/stores/pcbGenerator'
import { isBackendConfigured } from '@/config/api'
import PcbWorkerStatus from './PcbWorkerStatus.vue'
import PcbGeneratorSettings from './PcbGeneratorSettings.vue'
import PcbGeneratorControls from './PcbGeneratorControls.vue'
import PcbGeneratorResults from './PcbGeneratorResults.vue'
import PcbDownloadButton from './PcbDownloadButton.vue'
import BiExclamationTriangle from 'bootstrap-icons/icons/exclamation-triangle.svg'

const pcbStore = usePcbGeneratorStore()
const backendConfigured = isBackendConfigured()

// Cleanup on component unmount
onUnmounted(() => {
  pcbStore.cleanup()
})
</script>

<template>
  <div class="pcb-generator-panel">
    <!-- Backend Not Configured Warning -->
    <div
      v-if="!backendConfigured"
      class="alert alert-warning"
      role="alert"
      data-testid="pcb-backend-warning"
    >
      <h5 class="alert-heading"><BiExclamationTriangle /> Backend Not Configured</h5>
      <p class="mb-0">
        The PCB Generator requires a backend server. Please configure the
        <code>VITE_BACKEND_URL</code> environment variable and rebuild the application.
      </p>
      <hr />
      <p class="mb-0 small">
        For development: Set <code>VITE_BACKEND_URL=""</code> in <code>.env.local</code> to use the
        Vite proxy.
      </p>
    </div>

    <!-- Two Column Layout: Controls | Output -->
    <div v-else class="row g-3">
      <!-- Left Column: All Controls -->
      <div class="col-md-4" style="max-width: 500px">
        <!-- Settings Card -->
        <div class="settings-card">
          <PcbGeneratorSettings />
        </div>

        <!-- Controls Card -->
        <div class="controls-card">
          <PcbGeneratorControls />
          <PcbDownloadButton />
        </div>

        <!-- Worker Status -->
        <PcbWorkerStatus />
      </div>

      <!-- Right Column: All Output -->
      <div class="col-md-8 results-column">
        <div class="results-card">
          <PcbGeneratorResults />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pcb-generator-panel {
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

/* Card styling matching Plate Generator panel */
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
</style>
