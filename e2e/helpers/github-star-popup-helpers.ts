import { Page, Locator, expect } from '@playwright/test'
import { WaitHelpers } from './wait-helpers'

/**
 * Helper class for GitHub Star Popup interactions in E2E tests.
 * The popup is now rendered as a Bootstrap toast via the toast system.
 *
 * @example
 * ```typescript
 * const popupHelper = new GitHubStarPopupHelper(page, waitHelpers)
 * await popupHelper.showPopupAfterDelay(120000)
 * await popupHelper.expectPopupVisible()
 * await popupHelper.closePopup()
 * ```
 */
export class GitHubStarPopupHelper {
  constructor(
    private page: Page,
    private waitHelpers: WaitHelpers,
  ) {}

  // ============================================================================
  // Locator Getters
  // ============================================================================

  /**
   * Get the GitHub star popup toast locator.
   * The popup is a success-type toast with the specific title.
   */
  getPopup(): Locator {
    return this.page.locator('.toast.toast-success.show')
  }

  /**
   * Get the close button locator.
   */
  getCloseButton(): Locator {
    return this.getPopup().locator('.btn-close')
  }

  /**
   * Get the star button (GitHub link) locator.
   */
  getStarButton(): Locator {
    return this.getPopup().locator('.toast-body a.btn')
  }

  /**
   * Get the popup title locator.
   */
  getPopupTitle(): Locator {
    return this.getPopup().locator('.toast-header strong')
  }

  /**
   * Get the popup text locator.
   */
  getPopupText(): Locator {
    return this.getPopup().locator('.toast-body')
  }

  /**
   * Get the close button icon locator.
   */
  getCloseIcon(): Locator {
    return this.getCloseButton()
  }

  /**
   * Get the GitHub icon in star button locator.
   */
  getGitHubIcon(): Locator {
    return this.getStarButton()
  }

  // ============================================================================
  // Setup and State Management
  // ============================================================================

  /**
   * Initialize the page for popup testing.
   * Clears localStorage and sets the E2E test flag in sessionStorage.
   * Using sessionStorage ensures the flag persists across page navigations and reloads.
   */
  async initializeForTesting(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear()
      // Set flag in sessionStorage to persist across page navigations and reloads
      sessionStorage.setItem('__ALLOW_POPUP_IN_E2E__', 'true')
    })
  }

  /**
   * Simulate a first visit at a specific time in the past.
   *
   * @param millisecondsAgo - Time in milliseconds ago when first visit occurred
   */
  async simulateFirstVisit(millisecondsAgo: number): Promise<void> {
    const timeAgo = Date.now() - millisecondsAgo
    await this.page.evaluate((time) => {
      localStorage.setItem('kle-ng-first-visit-time', time.toString())
    }, timeAgo)
  }

  /**
   * Set the popup dismissed flag in localStorage.
   */
  async setDismissedFlag(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.setItem('kle-ng-github-star-popup-dismissed', 'true')
    })
  }

  /**
   * Get the popup dismissed state from localStorage.
   *
   * @returns The dismissed state ('true' or null)
   */
  async getDismissedState(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return localStorage.getItem('kle-ng-github-star-popup-dismissed')
    })
  }

  // ============================================================================
  // Popup Display Methods
  // ============================================================================

  /**
   * Show the popup by simulating a first visit delay and reloading.
   * Waits for the popup to be visible after reload to ensure component has mounted.
   *
   * @param millisecondsAgo - Time in milliseconds ago (default: 120000 = 2 minutes)
   */
  async showPopupAfterDelay(millisecondsAgo: number = 120000): Promise<void> {
    await this.simulateFirstVisit(millisecondsAgo)
    await this.page.reload()
    await this.page.waitForLoadState('domcontentloaded')
    // Wait for the toast to appear with Bootstrap's .show class
    await this.getPopup().waitFor({ state: 'visible', timeout: 5000 })
  }

  // ============================================================================
  // Popup Interaction Methods
  // ============================================================================

  /**
   * Close the popup by clicking the close button.
   */
  async closePopup(): Promise<void> {
    await this.getCloseButton().click()
  }

  /**
   * Click the star button and handle the new page that opens.
   * Returns the new page that was opened.
   *
   * @returns Promise resolving to the new page
   */
  async clickStarButton(): Promise<Page> {
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.getStarButton().click(),
    ])
    return newPage
  }

  // ============================================================================
  // Assertion Helpers
  // ============================================================================

  /**
   * Assert that the popup is visible.
   *
   * @param timeout - Optional timeout in milliseconds (default: 5000)
   */
  async expectPopupVisible(timeout: number = 5000): Promise<void> {
    await expect(this.getPopup()).toBeVisible({ timeout })
  }

  /**
   * Assert that the popup is NOT visible.
   */
  async expectPopupNotVisible(): Promise<void> {
    await expect(this.getPopup()).not.toBeVisible()
  }

  /**
   * Assert that the popup is NOT visible after waiting for animations to complete.
   * Uses RAF waits instead of hard timeout for deterministic waiting.
   */
  async expectPopupNotVisibleAfterWait(): Promise<void> {
    // Wait for any potential animations or delayed rendering
    await this.waitHelpers.waitForQuadAnimationFrame()
    await expect(this.getPopup()).not.toBeVisible()
  }

  /**
   * Assert that the popup has correct GitHub link attributes.
   */
  async expectCorrectGitHubLink(): Promise<void> {
    const starButton = this.getStarButton()
    await expect(starButton).toHaveAttribute('href', 'https://github.com/adamws/kle-ng')
    await expect(starButton).toHaveAttribute('target', '_blank')
    await expect(starButton).toHaveAttribute('rel', 'noopener noreferrer')
  }

  /**
   * Assert that the popup contains expected content.
   */
  async expectPopupContent(): Promise<void> {
    await expect(this.getPopupTitle()).toContainText('Enjoying KLE-NG?')
    await expect(this.getPopupText()).toContainText('star')
    await expect(this.getStarButton()).toContainText('Star on GitHub')
  }

  /**
   * Assert that the popup dismissed state is stored in localStorage.
   */
  async expectDismissedStateStored(): Promise<void> {
    const dismissedState = await this.getDismissedState()
    expect(dismissedState).toBe('true')
  }
}
