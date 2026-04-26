<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { getThree } from '@/utils/three-loader'
import type * as THREE from 'three'
import BiArrowCounterclockwise from 'bootstrap-icons/icons/arrow-counterclockwise.svg'

const props = defineProps<{
  stlData: string | undefined
  generating: boolean
  visible: boolean
}>()

const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const threeReady = ref(false)
const webglError = ref(false)
const controlsActive = ref(false)
const viewMode = ref<'solid' | 'wireframe'>('solid')

// Three.js scene state
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: InstanceType<
  typeof import('three/examples/jsm/controls/OrbitControls.js').OrbitControls
> | null = null
let currentMesh: THREE.Mesh | null = null
let currentEdgeLines: THREE.LineSegments | null = null
let rafId: number | null = null
let resizeObserver: ResizeObserver | null = null
let themeObserver: MutationObserver | null = null
let canvasActivateHandler: (() => void) | null = null
let documentDeactivateHandler: ((e: PointerEvent) => void) | null = null

// Initial camera state for reset
let initialCameraPosition: [number, number, number] | null = null
let initialTarget: [number, number, number] | null = null

// Cached runtime THREE module (set once scene is first created)
let runtimeTHREE: Awaited<ReturnType<typeof getThree>>['THREE'] | null = null

// --- Theme color helpers ---

function getThemeColors() {
  const T = runtimeTHREE!
  // Read the container's fully-resolved background color (avoids unresolved var() in CSS custom props)
  const bgResolved = containerRef.value
    ? getComputedStyle(containerRef.value).backgroundColor
    : 'rgb(248, 249, 250)'
  const bgColor = new T.Color(bgResolved)
  const primaryStr =
    getComputedStyle(document.documentElement).getPropertyValue('--bs-primary').trim() || '#00ab91'
  const primary = new T.Color(primaryStr)
  const specular = primary.clone().multiplyScalar(0.35)
  return { bgColor, primary, specular }
}

function applyThemeColors() {
  if (!runtimeTHREE || !renderer) return
  // Defer to next frame so the browser finishes style recalculation before we read colors
  requestAnimationFrame(() => {
    if (!runtimeTHREE || !renderer) return
    const { bgColor, primary, specular } = getThemeColors()
    renderer.setClearColor(bgColor)
    if (currentMesh) {
      const mat = currentMesh.material as THREE.MeshPhongMaterial
      mat.color.set(primary)
      mat.specular.set(specular)
      mat.needsUpdate = true
    }
    if (currentEdgeLines) {
      const mat = currentEdgeLines.material as THREE.LineBasicMaterial
      mat.color.set(primary)
      mat.needsUpdate = true
    }
  })
}

function applyViewMode() {
  if (!currentMesh || !scene) return
  if (viewMode.value === 'wireframe') {
    currentMesh.visible = false
    if (!currentEdgeLines) {
      const { primary } = getThemeColors()
      const edgesGeo = new runtimeTHREE!.EdgesGeometry(currentMesh.geometry, 10)
      const edgesMat = new runtimeTHREE!.LineBasicMaterial({ color: primary })
      currentEdgeLines = new runtimeTHREE!.LineSegments(edgesGeo, edgesMat)
      scene.add(currentEdgeLines)
    }
    currentEdgeLines.visible = true
  } else {
    currentMesh.visible = true
    if (currentEdgeLines) currentEdgeLines.visible = false
  }
}

// Load Three.js eagerly
onMounted(async () => {
  await getThree()
  threeReady.value = true
  // Try to set up scene if we already have STL data and container is visible
  if (props.stlData && props.visible) {
    waitForNonZeroSize()
  }
})

onUnmounted(() => {
  disposeScene()
})

// Watch for stlData changes — re-render
watch(
  () => props.stlData,
  (newData) => {
    if (newData && threeReady.value) {
      if (props.visible) {
        waitForNonZeroSize()
      } else if (renderer) {
        // stlData changed while hidden — the existing scene is now stale.
        // Dispose it so the visible watcher triggers a full rebuild instead of
        // just resuming RAF with the wrong (or empty) scene.
        disposeScene()
      }
    } else if (!newData) {
      disposeMesh()
    }
  },
)

watch(viewMode, applyViewMode)

// Watch visible prop — pause/resume RAF
watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      if (props.stlData && threeReady.value) {
        if (renderer && currentMesh) {
          // Scene is populated and current — just resume the render loop
          startRaf()
        } else {
          // renderer is null, or mesh was disposed (stlData went undefined then
          // came back) — need a full scene rebuild
          waitForNonZeroSize()
        }
      }
    } else {
      stopRaf()
    }
  },
)

function waitForNonZeroSize() {
  const container = containerRef.value
  if (!container) return

  if (container.offsetWidth > 0 && container.offsetHeight > 0) {
    setupScene()
  } else {
    // Wait for ResizeObserver to fire with non-zero dimensions
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          obs.disconnect()
          setupScene()
          return
        }
      }
    })
    obs.observe(container)
  }
}

async function setupScene() {
  if (!canvasRef.value || !containerRef.value || !props.stlData) return

  const modules = await getThree()
  const { THREE, STLLoader, OrbitControls } = modules

  // Cache runtime module for theme color helpers
  runtimeTHREE = THREE

  // Save current camera state before disposal so we can restore it after rebuild
  let savedCameraPosition: [number, number, number] | null = null
  let savedTarget: [number, number, number] | null = null
  const savedControlsActive = controlsActive.value
  if (camera && controls) {
    savedCameraPosition = [camera.position.x, camera.position.y, camera.position.z]
    savedTarget = [controls.target.x, controls.target.y, controls.target.z]
  }

  // Dispose previous scene
  disposeScene()

  const container = containerRef.value
  const width = container.offsetWidth
  const height = container.offsetHeight

  // Create renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true })

  // Check WebGL context
  if (!renderer.getContext()) {
    webglError.value = true
    renderer.dispose()
    renderer = null
    return
  }

  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)

  // Create scene
  scene = new THREE.Scene()

  // Create camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000)

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
  dirLight.position.set(1, 2, 3)
  scene.add(dirLight)
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
  fillLight.position.set(-2, -1, -1)
  scene.add(fillLight)

  // Load STL
  const encoder = new TextEncoder()
  const buffer = encoder.encode(props.stlData).buffer
  const geometry = new STLLoader().parse(buffer)

  const { bgColor, primary, specular } = getThemeColors()

  renderer.setClearColor(bgColor)

  const material = new THREE.MeshPhongMaterial({
    color: primary,
    specular: specular,
    shininess: 60,
  })
  currentMesh = new THREE.Mesh(geometry, material)
  scene.add(currentMesh)
  applyViewMode()

  // Auto-fit camera to bounding box
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  const center = new THREE.Vector3()
  box.getCenter(center)
  const size = new THREE.Vector3()
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)

  // Store initial state for reset button (always the auto-fit view)
  initialCameraPosition = [center.x, center.y, center.z + maxDim * 1.5]
  initialTarget = [center.x, center.y, center.z]

  // Orbit controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  if (savedCameraPosition && savedTarget) {
    // Restore user's previous navigation state
    camera.position.set(...savedCameraPosition)
    controls.target.set(...savedTarget)
  } else {
    // First load: use auto-fit
    camera.position.set(...initialCameraPosition)
    camera.lookAt(center)
    controls.target.copy(center)
  }
  controls.update()

  // Restore controls active state; disable if user hadn't activated yet
  if (savedControlsActive) {
    activateControls()
  } else {
    controls.enabled = false
    canvasRef.value!.style.touchAction = 'auto'
  }

  canvasActivateHandler = () => activateControls()
  canvasRef.value!.addEventListener('pointerdown', canvasActivateHandler)

  documentDeactivateHandler = (e: PointerEvent) => {
    if (controlsActive.value && !containerRef.value?.contains(e.target as Node)) {
      deactivateControls()
    }
  }
  document.addEventListener('pointerdown', documentDeactivateHandler)

  // ResizeObserver
  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !camera || !containerRef.value) return
    const w = containerRef.value.offsetWidth
    const h = containerRef.value.offsetHeight
    if (w === 0 || h === 0) return
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  })
  resizeObserver.observe(container)

  // Watch for theme changes and update colors
  themeObserver = new MutationObserver(applyThemeColors)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-bs-theme'],
  })

  // Start render loop
  startRaf()
}

function startRaf() {
  if (rafId !== null) return
  function animate() {
    rafId = requestAnimationFrame(animate)
    controls?.update()
    if (renderer && scene && camera) {
      renderer.render(scene, camera)
    }
  }
  animate()
}

function stopRaf() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

function disposeMesh() {
  if (currentEdgeLines) {
    currentEdgeLines.geometry.dispose()
    ;(currentEdgeLines.material as THREE.Material).dispose()
    scene?.remove(currentEdgeLines)
    currentEdgeLines = null
  }
  if (currentMesh) {
    currentMesh.geometry.dispose()
    ;(currentMesh.material as THREE.Material).dispose()
    scene?.remove(currentMesh)
    currentMesh = null
  }
}

function activateControls() {
  if (!controls || controlsActive.value) return
  controlsActive.value = true
  controls.enabled = true
  if (canvasRef.value) canvasRef.value.style.touchAction = 'none'
}

function deactivateControls() {
  if (!controls) return
  controlsActive.value = false
  controls.enabled = false
  if (canvasRef.value) canvasRef.value.style.touchAction = 'auto'
}

function resetView() {
  if (!camera || !controls || !initialCameraPosition || !initialTarget) return
  camera.position.set(...initialCameraPosition)
  controls.target.set(...initialTarget)
  controls.update()
}

function disposeScene() {
  stopRaf()
  themeObserver?.disconnect()
  themeObserver = null
  resizeObserver?.disconnect()
  resizeObserver = null
  disposeMesh()
  deactivateControls()
  document.removeEventListener('pointerdown', documentDeactivateHandler!)
  documentDeactivateHandler = null
  if (canvasRef.value && canvasActivateHandler) {
    canvasRef.value.removeEventListener('pointerdown', canvasActivateHandler)
  }
  canvasActivateHandler = null
  controls?.dispose()
  controls = null
  controlsActive.value = false
  renderer?.dispose()
  renderer = null
  scene = null
  camera = null
  initialCameraPosition = null
  initialTarget = null
}
</script>

<template>
  <div ref="containerRef" class="plate-3d-preview">
    <!-- Loading Three.js -->
    <div v-if="!threeReady" class="preview-placeholder">
      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      Loading 3D engine&hellip;
    </div>

    <!-- WebGL error -->
    <div v-else-if="webglError" class="preview-placeholder">
      WebGL unavailable — browser context limit reached
    </div>

    <!-- No STL (outline disabled) -->
    <div v-else-if="!stlData" class="preview-placeholder">
      Enable Outline and Generate to preview 3D
    </div>

    <!-- Three.js canvas -->
    <canvas
      ref="canvasRef"
      v-show="threeReady && !webglError && !!stlData"
      class="three-canvas"
      data-testid="plate-3d-canvas"
    />

    <!-- Click-to-activate overlay (shown when canvas is ready but controls not yet active) -->
    <div
      v-if="threeReady && !webglError && !!stlData && !controlsActive"
      class="activate-overlay"
      @pointerdown.stop="activateControls"
    >
      <span class="activate-hint">Click to navigate</span>
    </div>

    <!-- View mode toggle + reset view -->
    <div v-if="threeReady && !webglError && !!stlData" class="canvas-controls">
      <div class="btn-group btn-group-sm" role="group" aria-label="3D view controls">
        <input
          id="view-solid"
          v-model="viewMode"
          type="radio"
          class="btn-check"
          value="solid"
          autocomplete="off"
        />
        <label class="btn btn-secondary" for="view-solid">Solid</label>
        <input
          id="view-wireframe"
          v-model="viewMode"
          type="radio"
          class="btn-check"
          value="wireframe"
          autocomplete="off"
        />
        <label class="btn btn-secondary" for="view-wireframe">Wireframe</label>
        <button
          class="btn btn-secondary d-flex align-items-center"
          title="Reset view"
          @click="resetView"
        >
          <BiArrowCounterclockwise />
        </button>
      </div>
    </div>

    <!-- Regenerating overlay -->
    <div v-if="generating && stlData" class="regenerating-overlay">
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
    </div>
  </div>
</template>

<style scoped>
.plate-3d-preview {
  width: 100%;
  height: 100%;
  position: relative;
  background: var(--bs-tertiary-bg);
  border-radius: 4px;
  overflow: hidden;
}

.preview-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  color: var(--bs-secondary-color);
}

.three-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.canvas-controls {
  position: absolute;
  bottom: 8px;
  right: 8px;
}

.activate-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 32px;
  cursor: pointer;
}

.activate-hint {
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 0.75rem;
  border-radius: 4px;
  padding: 4px 10px;
}

.regenerating-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  padding: 4px 6px;
  color: #fff;
}
</style>
