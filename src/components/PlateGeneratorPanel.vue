<script setup lang="ts">
import { onMounted } from 'vue'
import { preloadMakerJsModule } from '@/utils/makerjs-loader'
import PlateGeneratorSettings from './PlateGeneratorSettings.vue'
import PlateGeneratorControls from './PlateGeneratorControls.vue'
import PlateGeneratorResults from './PlateGeneratorResults.vue'
import PlateDownloadButtons from './PlateDownloadButtons.vue'

// Preload maker.js when component mounts
onMounted(() => {
  preloadMakerJsModule()
})
</script>

<template>
  <div class="plate-generator-panel">
    <!-- Two Column Layout: Controls | Output -->
    <div class="row g-3 h-100">
      <!-- Left Column: All Controls -->
      <div class="col-md-4 d-flex flex-column" style="max-width: 500px">
        <div class="flex-grow-0">
          <PlateGeneratorSettings />
          <PlateGeneratorControls />
          <PlateDownloadButtons />
        </div>
      </div>

      <!-- Right Column: All Output -->
      <div class="col-md-8">
        <div class="results-container">
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

.results-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
}
</style>
