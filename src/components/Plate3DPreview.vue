<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { getThree } from '@/utils/three-loader'
import type * as THREE from 'three'

const props = defineProps<{
  stlData: string | undefined
  generating: boolean
  visible: boolean
}>()

const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const threeReady = ref(false)
const webglError = ref(false)

// Three.js scene state
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: InstanceType<
  typeof import('three/examples/jsm/controls/OrbitControls.js').OrbitControls
> | null = null
let currentMesh: THREE.Mesh | null = null
let rafId: number | null = null
let resizeObserver: ResizeObserver | null = null
let themeObserver: MutationObserver | null = null

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
  })
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
    if (newData && threeReady.value && props.visible) {
      waitForNonZeroSize()
    } else if (!newData) {
      disposeMesh()
    }
  },
)

// Watch visible prop — pause/resume RAF
watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      if (props.stlData && threeReady.value) {
        if (renderer) {
          // Already have a scene, just restart RAF
          startRaf()
        } else {
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

  // Auto-fit camera to bounding box
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  const center = new THREE.Vector3()
  box.getCenter(center)
  const size = new THREE.Vector3()
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)
  camera.position.set(center.x, center.y + maxDim * 0.5, center.z + maxDim * 1.5)
  camera.lookAt(center)

  // Orbit controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(center)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.update()

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
  if (currentMesh) {
    currentMesh.geometry.dispose()
    ;(currentMesh.material as THREE.Material).dispose()
    scene?.remove(currentMesh)
    currentMesh = null
  }
}

function disposeScene() {
  stopRaf()
  themeObserver?.disconnect()
  themeObserver = null
  resizeObserver?.disconnect()
  resizeObserver = null
  disposeMesh()
  controls?.dispose()
  controls = null
  renderer?.dispose()
  renderer = null
  scene = null
  camera = null
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
    <canvas ref="canvasRef" v-show="threeReady && !webglError && !!stlData" class="three-canvas" />

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
