<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import BiZoomIn from 'bootstrap-icons/icons/zoom-in.svg'
import BiZoomOut from 'bootstrap-icons/icons/zoom-out.svg'
import BiArrowCounterclockwise from 'bootstrap-icons/icons/arrow-counterclockwise.svg'

interface Props {
  frontSvg: string | null
  backSvg: string | null
  schematicSvg: string | null
}

const props = defineProps<Props>()

type ViewType = 'front' | 'back' | 'schematic'

const containerRef = ref<HTMLElement | null>(null)
const currentView = ref<ViewType>('schematic')
const isPanning = ref(false)
const lastMouseX = ref(0)
const lastMouseY = ref(0)
const controlsActive = ref(false)

// Schematic and PCB (front/back) have independent zoom/pan state
const schematicState = ref({ zoom: 1, panX: 0, panY: 0 })
const pcbState = ref({ zoom: 1, panX: 0, panY: 0 })

const viewState = computed(() =>
  currentView.value === 'schematic' ? schematicState.value : pcbState.value,
)

let wheelHandler: ((e: WheelEvent) => void) | null = null
let documentDeactivateHandler: ((e: PointerEvent) => void) | null = null

const currentSvgUrl = computed(() => {
  switch (currentView.value) {
    case 'front':
      return props.frontSvg
    case 'back':
      return props.backSvg
    case 'schematic':
      return props.schematicSvg
    default:
      return null
  }
})

function setView(view: ViewType) {
  currentView.value = view
}

function zoomIn() {
  viewState.value.zoom = Math.min(viewState.value.zoom + 0.25, 3)
}

function zoomOut() {
  viewState.value.zoom = Math.max(viewState.value.zoom - 0.25, 0.25)
}

function resetView() {
  viewState.value.zoom = 1
  viewState.value.panX = 0
  viewState.value.panY = 0
}

function activateControls() {
  if (controlsActive.value) return
  controlsActive.value = true
  wheelHandler = (e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.25 : 0.25
    viewState.value.zoom = Math.min(Math.max(viewState.value.zoom + delta, 0.25), 3)
  }
  containerRef.value?.addEventListener('wheel', wheelHandler, { passive: false })
}

function deactivateControls() {
  if (!controlsActive.value) return
  controlsActive.value = false
  isPanning.value = false
  if (wheelHandler && containerRef.value) {
    containerRef.value.removeEventListener('wheel', wheelHandler)
    wheelHandler = null
  }
}

onMounted(() => {
  documentDeactivateHandler = (e: PointerEvent) => {
    if (controlsActive.value && !containerRef.value?.contains(e.target as Node)) {
      deactivateControls()
    }
  }
  document.addEventListener('pointerdown', documentDeactivateHandler)
})

onUnmounted(() => {
  if (documentDeactivateHandler) {
    document.removeEventListener('pointerdown', documentDeactivateHandler)
  }
  deactivateControls()
})

function handleMouseDown(event: MouseEvent) {
  activateControls()
  isPanning.value = true
  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
  event.preventDefault()
}

function handleMouseMove(event: MouseEvent) {
  if (!isPanning.value) return

  const deltaX = event.clientX - lastMouseX.value
  const deltaY = event.clientY - lastMouseY.value

  viewState.value.panX += deltaX
  viewState.value.panY += deltaY

  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY
}

function handleMouseUp() {
  isPanning.value = false
}

const transformStyle = computed(() => {
  const { panX, panY, zoom } = viewState.value
  return `translate(${panX}px, ${panY}px) scale(${zoom})`
})

const containerBackgroundClass = computed(() => {
  return currentView.value === 'schematic' ? 'svg-container-schematic' : 'svg-container-pcb'
})
</script>

<template>
  <div ref="containerRef" class="pcb-render-viewer">
    <!-- Tab bar at top -->
    <div class="tab-bar">
      <button
        class="tab-bar-item"
        :class="{ active: currentView === 'schematic' }"
        @click="setView('schematic')"
      >
        Schematic
      </button>
      <button
        class="tab-bar-item"
        :class="{ active: currentView === 'front' }"
        @click="setView('front')"
      >
        PCB Front
      </button>
      <button
        class="tab-bar-item"
        :class="{ active: currentView === 'back' }"
        @click="setView('back')"
      >
        PCB Back
      </button>
    </div>

    <!-- SVG Viewer -->
    <div
      class="svg-container"
      :class="[containerBackgroundClass, { active: controlsActive }]"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    >
      <div v-if="currentSvgUrl" class="svg-wrapper" :style="{ transform: transformStyle }">
        <img :src="currentSvgUrl" alt="PCB Render" />
      </div>
      <div v-else class="text-muted text-center p-4">No render available for this view</div>

      <!-- Activate hint overlay (shown when controls are inactive) -->
      <div v-if="!controlsActive" class="activate-overlay">
        <span class="activate-hint">Click to pan &middot; scroll to zoom</span>
      </div>

      <!-- Zoom controls in bottom-right corner -->
      <div class="zoom-controls" @mousedown.stop>
        <div class="btn-group btn-group-sm" role="group">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            title="Zoom out"
            @click.stop="zoomOut"
          >
            <BiZoomOut />
          </button>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            title="Reset view"
            @click.stop="resetView"
          >
            <BiArrowCounterclockwise />
          </button>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            title="Zoom in"
            @click.stop="zoomIn"
          >
            <BiZoomIn />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pcb-render-viewer {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

/* Segmented tab bar matching PlateGeneratorResults style */
.tab-bar {
  display: flex;
  background-color: var(--bs-secondary-bg);
  border-radius: 5px;
  padding: 3px;
  gap: 2px;
  margin-bottom: 8px;
  flex-shrink: 0;
  width: fit-content;
}

.tab-bar-item {
  padding: 0.25rem 1rem;
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

.svg-container {
  flex-grow: 1;
  min-height: 250px;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  overflow: hidden;
  position: relative;
  cursor: pointer;
}

.svg-container.active {
  cursor: grab;
}

.svg-container.active:active {
  cursor: grabbing;
}

.svg-container-schematic {
  background-color: #f5f4ef;
}

.svg-container-pcb {
  background-color: #2b2b2b;
}

.svg-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
  transition: transform 0.1s ease-out;
}

.svg-wrapper img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

/* Activate hint overlay */
.activate-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 32px;
  pointer-events: none;
}

.activate-hint {
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 0.75rem;
  border-radius: 4px;
  padding: 4px 10px;
}

/* Zoom controls in bottom-right corner, same style as 3D preview */
.zoom-controls {
  position: absolute;
  bottom: 8px;
  right: 8px;
}

.zoom-controls .btn {
  padding: 4px 6px;
  display: flex;
  align-items: center;
}
</style>
