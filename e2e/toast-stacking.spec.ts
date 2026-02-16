import { test, expect } from '@playwright/test'
import { WaitHelpers } from './helpers/wait-helpers'

// Type declaration for the global toast helper
declare global {
  interface Window {
    __kleToast: {
      showSuccess: (message: string, title: string, options?: object) => string
      showError: (message: string, title: string, options?: object) => string
      showWarning: (message: string, title: string, options?: object) => string
      showInfo: (message: string, title: string, options?: object) => string
    }
  }
}

test.describe('Toast Stacking System', () => {
  let waitHelpers: WaitHelpers

  test.beforeEach(async ({ page }) => {
    waitHelpers = new WaitHelpers(page)
    await page.goto('/')
    await waitHelpers.waitForDoubleAnimationFrame()
  })

  test('should display single toast correctly positioned in bottom-right', async ({ page }) => {
    // Trigger a single toast via the global helper
    await page.evaluate(() => {
      window.__kleToast.showSuccess('Test toast message', 'Test Title')
    })

    // Wait for toast to appear (Bootstrap adds .show class)
    const toast = page.locator('.toast.show').first()
    await expect(toast).toBeVisible()

    const viewportSize = page.viewportSize()
    const toastBox = await toast.boundingBox()

    expect(viewportSize).toBeTruthy()
    expect(toastBox).toBeTruthy()

    if (viewportSize && toastBox) {
      // Toast should be in the bottom-right area
      expect(toastBox.x + toastBox.width).toBeGreaterThan(viewportSize.width - 100)
      expect(toastBox.y + toastBox.height).toBeGreaterThan(viewportSize.height / 2)
    }

    // Check toast contains correct content
    await expect(toast.locator('.toast-header strong')).toHaveText('Test Title')
    await expect(toast.locator('.toast-body')).toContainText('Test toast message')
  })

  test('should stack multiple toasts vertically without overlapping', async ({ page }) => {
    // Trigger multiple toasts with delays
    await page.evaluate(() => {
      const showToast = (message: string, title: string, delay: number) => {
        setTimeout(() => {
          window.__kleToast.showSuccess(message, title)
        }, delay)
      }

      showToast('First toast', 'Toast 1', 0)
      showToast('Second toast', 'Toast 2', 100)
      showToast('Third toast', 'Toast 3', 200)
    })

    // Wait for all 3 toasts to appear
    const toasts = page.locator('.toast.show')
    await expect(toasts).toHaveCount(3, { timeout: 5000 })

    // Allow animations to complete using RAF
    await waitHelpers.waitForQuadAnimationFrame()

    const toastCount = await toasts.count()
    expect(toastCount).toBe(3)

    // Check that toasts are stacked vertically without overlapping
    const toastBoxes = []
    for (let i = 0; i < toastCount; i++) {
      const box = await toasts.nth(i).boundingBox()
      expect(box).toBeTruthy()
      if (box) toastBoxes.push(box)
    }

    // Verify toasts are positioned vertically with no overlap
    for (let i = 0; i < toastBoxes.length - 1; i++) {
      const a = toastBoxes[i]
      const b = toastBoxes[i + 1]

      // Toasts must not overlap vertically
      const noOverlap = b.y >= a.y + a.height - 1 || a.y >= b.y + b.height - 1
      expect(noOverlap).toBe(true)
    }

    // Verify content is correct (reversed DOM order, newest first)
    await expect(toasts.nth(0).locator('.toast-header strong')).toHaveText('Toast 3')
    await expect(toasts.nth(1).locator('.toast-header strong')).toHaveText('Toast 2')
    await expect(toasts.nth(2).locator('.toast-header strong')).toHaveText('Toast 1')
  })

  test('should handle toast removal and remaining toasts reflow correctly', async ({ page }) => {
    // Show multiple toasts with long duration
    await page.evaluate(() => {
      window.__kleToast.showSuccess('First toast', 'Toast 1', { duration: 10000 })
      setTimeout(() => {
        window.__kleToast.showSuccess('Second toast', 'Toast 2', { duration: 10000 })
      }, 100)
      setTimeout(() => {
        window.__kleToast.showSuccess('Third toast', 'Toast 3', { duration: 10000 })
      }, 200)
    })

    // Wait for all toasts to appear using RAF
    await waitHelpers.waitForQuadAnimationFrame()

    const toasts = page.locator('.toast.show')
    await expect(toasts).toHaveCount(3)

    // Close the top toast (newest = Toast 3, which is nth(0) in reversed DOM order)
    await toasts.nth(0).locator('.btn-close').click()

    // Wait for Bootstrap fade-out animation + DOM removal
    await page.waitForTimeout(500)

    // Check that only 2 toasts remain
    await expect(toasts).toHaveCount(2)

    // Verify remaining toasts are properly stacked without overlap
    const finalBoxes = []
    for (let i = 0; i < 2; i++) {
      const box = await toasts.nth(i).boundingBox()
      expect(box).toBeTruthy()
      if (box) finalBoxes.push(box)
    }

    const noOverlap =
      finalBoxes[1].y >= finalBoxes[0].y + finalBoxes[0].height - 1 ||
      finalBoxes[0].y >= finalBoxes[1].y + finalBoxes[1].height - 1
    expect(noOverlap).toBe(true)

    // Verify content is correct (Toast 3 was removed, remaining in reversed order)
    await expect(toasts.nth(0).locator('.toast-header strong')).toHaveText('Toast 2')
    await expect(toasts.nth(1).locator('.toast-header strong')).toHaveText('Toast 1')
  })

  test('should display different toast types with correct styling', async ({ page }) => {
    // Show different types of toasts
    await page.evaluate(() => {
      window.__kleToast.showSuccess('Success message', 'Success', { duration: 10000 })
      setTimeout(() => {
        window.__kleToast.showError('Error message', 'Error', { duration: 10000 })
      }, 100)
      setTimeout(() => {
        window.__kleToast.showWarning('Warning message', 'Warning', { duration: 10000 })
      }, 200)
      setTimeout(() => {
        window.__kleToast.showInfo('Info message', 'Info', { duration: 10000 })
      }, 300)
    })

    // Wait for all toast types to appear using RAF
    await waitHelpers.waitForAnimationFrames(5)

    const toasts = page.locator('.toast.show')
    await expect(toasts).toHaveCount(4)

    // Check that each toast has the correct type class (reversed DOM order)
    await expect(toasts.nth(0)).toHaveClass(/toast-info/)
    await expect(toasts.nth(1)).toHaveClass(/toast-warning/)
    await expect(toasts.nth(2)).toHaveClass(/toast-error/)
    await expect(toasts.nth(3)).toHaveClass(/toast-success/)
  })

  test('should auto-dismiss toasts after specified duration', async ({ page }) => {
    // Show toast with short duration
    await page.evaluate(() => {
      window.__kleToast.showSuccess('Short duration toast', 'Test', { duration: 1000 })
    })

    const toast = page.locator('.toast.show').first()
    await expect(toast).toBeVisible()

    // Wait for auto-dismiss (1000ms delay + 150ms Bootstrap fade-out + buffer)
    await page.waitForTimeout(1500)
    await expect(page.locator('.toast.show')).toHaveCount(0)
  })

  test('should be responsive on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Show a toast
    await page.evaluate(() => {
      window.__kleToast.showSuccess('Mobile toast test', 'Mobile Test')
    })

    const toast = page.locator('.toast.show').first()
    await expect(toast).toBeVisible()

    const toastBox = await toast.boundingBox()
    expect(toastBox).toBeTruthy()

    if (toastBox) {
      // Toast should fit within viewport width
      expect(toastBox.x).toBeGreaterThanOrEqual(0)
      expect(toastBox.x + toastBox.width).toBeLessThanOrEqual(375)
    }
  })

  test('should handle rapid toast creation without breaking layout', async ({ page }) => {
    // Rapidly create multiple toasts
    await page.evaluate(() => {
      for (let i = 0; i < 6; i++) {
        window.__kleToast.showInfo(`Rapid toast ${i + 1}`, `Test ${i + 1}`, { duration: 8000 })
      }
    })

    // Wait for rapid creation to complete using RAF
    await waitHelpers.waitForAnimationFrames(3)

    const toasts = page.locator('.toast.show')
    const toastCount = await toasts.count()

    // Should have created all toasts
    expect(toastCount).toBe(6)

    // Check that all toasts are properly positioned (no overlaps)
    const positions = []
    for (let i = 0; i < toastCount; i++) {
      const box = await toasts.nth(i).boundingBox()
      if (box) positions.push(box)
    }

    // Verify no overlaps
    for (let i = 0; i < positions.length - 1; i++) {
      const a = positions[i]
      const b = positions[i + 1]
      const noOverlap = b.y >= a.y + a.height - 1 || a.y >= b.y + b.height - 1
      expect(noOverlap).toBe(true)
    }
  })

  test('should maintain accessibility attributes', async ({ page }) => {
    await page.evaluate(() => {
      window.__kleToast.showSuccess('Accessibility test', 'A11y Test')
    })

    const toast = page.locator('.toast.show').first()
    await expect(toast).toBeVisible()

    // Check accessibility attributes
    await expect(toast).toHaveAttribute('role', 'alert')
    await expect(toast).toHaveAttribute('aria-live', 'polite')
    await expect(toast).toHaveAttribute('aria-atomic', 'true')

    // Check close button accessibility
    const closeButton = toast.locator('.btn-close')
    await expect(closeButton).toHaveAttribute('aria-label', 'Close notification')
    await expect(closeButton).toHaveAttribute('type', 'button')
  })
})
