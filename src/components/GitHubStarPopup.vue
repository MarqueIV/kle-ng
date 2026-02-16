<template>
  <div />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { toast } from '@/composables/useToast'

const STORAGE_KEY = 'kle-ng-github-star-popup-dismissed'
const VISIT_TIME_KEY = 'kle-ng-first-visit-time'
const DISPLAY_DELAY = 60000 // 1 minute in milliseconds

let timeoutId: number | null = null
let toastId: string | null = null

const showPopup = () => {
  if (toastId) return
  toastId = toast.showToast({
    message:
      'If you find this tool useful, please consider starring it on GitHub to support the project!',
    title: 'Enjoying KLE-NG?',
    type: 'success',
    duration: 0,
    showIcon: true,
    showCloseButton: true,
    actionLabel: 'Star on GitHub',
    actionUrl: 'https://github.com/adamws/kle-ng',
    onClose: () => {
      localStorage.setItem(STORAGE_KEY, 'true')
      toastId = null
    },
  })
}

const checkAndShowPopup = () => {
  // Skip popup in unit test environments only
  // Allow E2E tests (which set sessionStorage flag that persists across page navigations)
  const isUnitTest =
    import.meta.env.MODE === 'test' ||
    typeof (globalThis as Record<string, unknown>).describe !== 'undefined'
  const isE2ETest =
    typeof navigator !== 'undefined' &&
    navigator.webdriver &&
    sessionStorage.getItem('__ALLOW_POPUP_IN_E2E__') === 'true'

  if (isUnitTest && !isE2ETest) {
    return
  }

  // Check if popup was already dismissed
  const wasDismissed = localStorage.getItem(STORAGE_KEY) === 'true'
  if (wasDismissed) {
    return
  }

  // Get or set first visit time
  const firstVisitTime = localStorage.getItem(VISIT_TIME_KEY)
  const now = Date.now()

  if (!firstVisitTime) {
    // First visit - store the current time
    localStorage.setItem(VISIT_TIME_KEY, now.toString())

    // Set timeout to show popup after 1 minute
    timeoutId = window.setTimeout(() => {
      // Check again if popup wasn't dismissed in the meantime
      if (localStorage.getItem(STORAGE_KEY) !== 'true') {
        showPopup()
      }
    }, DISPLAY_DELAY)
  } else {
    // Check if this is still a new user (within first session)
    const timeSinceFirstVisit = now - parseInt(firstVisitTime, 10)

    if (timeSinceFirstVisit < DISPLAY_DELAY) {
      // User hasn't been here for 1 minute yet, show popup after remaining time
      const remainingTime = DISPLAY_DELAY - timeSinceFirstVisit
      timeoutId = window.setTimeout(() => {
        if (localStorage.getItem(STORAGE_KEY) !== 'true') {
          showPopup()
        }
      }, remainingTime)
    } else {
      // User has been here for more than 1 minute, show popup immediately
      showPopup()
    }
  }
}

onMounted(() => {
  checkAndShowPopup()
})

onUnmounted(() => {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
})
</script>
