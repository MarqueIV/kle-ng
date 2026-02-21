import { expect, type Locator, type Page } from '@playwright/test'
import { WaitHelpers } from './wait-helpers'

/**
 * LabelSearchHelper encapsulates all interactions with the canvas label search feature.
 *
 * The search bar is an overlay that sits inside the canvas container. It can be opened
 * via a magnifying-glass trigger button or the `/` keyboard shortcut while the canvas
 * has focus.
 *
 * @example
 * ```ts
 * const searchHelper = new LabelSearchHelper(page, waitHelpers)
 * await searchHelper.openViaKeyboard()
 * await searchHelper.typeQuery('Ctrl')
 * await searchHelper.expectCountDisplay('1 / 2')
 * await searchHelper.close()
 * ```
 */
export class LabelSearchHelper {
  constructor(
    private readonly page: Page,
    private readonly waitHelpers: WaitHelpers,
  ) {}

  // ==================== Locators ====================

  /**
   * The magnifying-glass trigger button shown when the search bar is closed.
   * Uses the aria-label as a stable selector (no data-testid on this element).
   */
  getTriggerButton(): Locator {
    return this.page.locator('.canvas-search-trigger')
  }

  /**
   * The search bar container element (`role="search"`).
   * Present in the DOM only while the search bar is open (v-if rendering).
   */
  getSearchBar(): Locator {
    return this.page.locator('[role="search"]')
  }

  /**
   * The text input inside the search bar.
   * Note: the trigger button also carries aria-label="Search key labels" so we
   * narrow to the `input` element to avoid a strict-mode violation.
   */
  getInput(): Locator {
    return this.page.locator('input[aria-label="Search key labels"]')
  }

  /**
   * The match count display span (`aria-live="polite"`).
   * Shows "1 / N", "No matches", or empty string depending on state.
   */
  getCountDisplay(): Locator {
    return this.page.locator('.search-count')
  }

  /**
   * The "Previous match" navigation button.
   */
  getPrevButton(): Locator {
    return this.page.locator('[aria-label="Previous match"]')
  }

  /**
   * The "Next match" navigation button.
   */
  getNextButton(): Locator {
    return this.page.locator('[aria-label="Next match"]')
  }

  /**
   * The "Close search" button (X icon).
   */
  getCloseButton(): Locator {
    return this.page.locator('[aria-label="Close search"]')
  }

  /**
   * The "Selected" status counter in the toolbar area.
   */
  getSelectedCounter(): Locator {
    return this.page.getByTestId('counter-selected')
  }

  // ==================== Actions ====================

  /**
   * Open the search bar by clicking the magnifying-glass trigger button.
   * Waits for the search bar and its input to become visible.
   */
  async openViaButton(): Promise<void> {
    await this.getTriggerButton().click()
    await expect(this.getSearchBar()).toBeVisible()
    await expect(this.getInput()).toBeVisible()
  }

  /**
   * Open the search bar using the `/` keyboard shortcut.
   * The canvas element must already have focus before calling this method.
   * Waits for the search bar and input to appear and for the macrotask auto-focus
   * to complete (setTimeout(0) in CanvasSearchBar.vue).
   */
  async openViaKeyboard(): Promise<void> {
    await this.page.keyboard.press('/')
    await expect(this.getSearchBar()).toBeVisible()
    // The component schedules focus via setTimeout(0). A small wait via an extra
    // animation frame ensures the macrotask has fired before subsequent assertions.
    await this.waitHelpers.waitForAnimationFrames(2)
  }

  /**
   * Type a search query into the input field.
   * Uses `fill` rather than `type` so the value is set atomically, which avoids
   * intermediate partial-match renders that could cause timing issues.
   *
   * @param query - The text to search for.
   */
  async typeQuery(query: string): Promise<void> {
    await this.getInput().fill(query)
    // Allow Vue reactivity and the canvas render scheduler to process the change.
    await this.waitHelpers.waitForAnimationFrames(2)
  }

  /**
   * Clear the current query by filling the input with an empty string.
   */
  async clearQuery(): Promise<void> {
    await this.getInput().fill('')
    await this.waitHelpers.waitForAnimationFrames(2)
  }

  /**
   * Navigate to the next match by clicking the "Next match" button.
   */
  async clickNext(): Promise<void> {
    await this.getNextButton().click()
    await this.waitHelpers.waitForAnimationFrames(2)
  }

  /**
   * Navigate to the previous match by clicking the "Previous match" button.
   */
  async clickPrev(): Promise<void> {
    await this.getPrevButton().click()
    await this.waitHelpers.waitForAnimationFrames(2)
  }

  /**
   * Navigate to the next match using the Enter key shortcut inside the search input.
   */
  async pressEnterForNext(): Promise<void> {
    await this.getInput().press('Enter')
    await this.waitHelpers.waitForAnimationFrames(2)
  }

  /**
   * Navigate to the previous match using the Shift+Enter shortcut inside the search input.
   */
  async pressShiftEnterForPrev(): Promise<void> {
    await this.getInput().press('Shift+Enter')
    await this.waitHelpers.waitForAnimationFrames(2)
  }

  /**
   * Close the search bar by clicking the "Close search" button.
   * Waits for the search bar to be removed from the DOM.
   */
  async closeViaButton(): Promise<void> {
    await this.getCloseButton().click()
    await expect(this.getSearchBar()).toBeHidden()
  }

  /**
   * Close the search bar by pressing Escape while the search input is focused.
   * Waits for the search bar to be removed from the DOM.
   */
  async closeViaEscape(): Promise<void> {
    await this.getInput().press('Escape')
    await expect(this.getSearchBar()).toBeHidden()
  }

  /**
   * Close the search bar by pressing `/` while the canvas has focus.
   * The canvas must be focused before calling this.
   */
  async closeViaSlashOnCanvas(): Promise<void> {
    await this.page.keyboard.press('/')
    await expect(this.getSearchBar()).toBeHidden()
  }

  // ==================== Assertions ====================

  /**
   * Assert the search bar is visible.
   */
  async expectOpen(): Promise<void> {
    await expect(this.getSearchBar()).toBeVisible()
  }

  /**
   * Assert the search bar is not present in the DOM.
   */
  async expectClosed(): Promise<void> {
    await expect(this.getSearchBar()).toBeHidden()
  }

  /**
   * Assert the trigger button is visible (which it is whenever the search bar is closed).
   */
  async expectTriggerVisible(): Promise<void> {
    await expect(this.getTriggerButton()).toBeVisible()
  }

  /**
   * Assert the count display shows the given text.
   *
   * @param text - Expected text, e.g. "1 / 3", "No matches", or "" for empty.
   */
  async expectCountDisplay(text: string): Promise<void> {
    await expect(this.getCountDisplay()).toHaveText(text)
  }

  /**
   * Assert the count display contains "No matches" and carries the danger text class.
   */
  async expectNoMatches(): Promise<void> {
    await expect(this.getCountDisplay()).toHaveText('No matches')
    await expect(this.getCountDisplay()).toHaveClass(/text-danger/)
  }

  /**
   * Assert the count display is empty (no query entered or empty query).
   */
  async expectCountEmpty(): Promise<void> {
    await expect(this.getCountDisplay()).toHaveText('')
  }

  /**
   * Assert the "Next match" and "Previous match" buttons are both disabled.
   * Used to verify the no-matches state.
   */
  async expectNavButtonsDisabled(): Promise<void> {
    await expect(this.getNextButton()).toBeDisabled()
    await expect(this.getPrevButton()).toBeDisabled()
  }

  /**
   * Assert the "Next match" and "Previous match" buttons are both enabled.
   */
  async expectNavButtonsEnabled(): Promise<void> {
    await expect(this.getNextButton()).toBeEnabled()
    await expect(this.getPrevButton()).toBeEnabled()
  }

  /**
   * Assert the search input is focused.
   * Useful for verifying auto-focus behavior after opening.
   */
  async expectInputFocused(): Promise<void> {
    await expect(this.getInput()).toBeFocused()
  }

  /**
   * Assert the "Selected" counter shows the given count.
   *
   * @param count - The expected number of selected keys.
   */
  async expectSelectedCount(count: number): Promise<void> {
    await expect(this.getSelectedCounter()).toContainText(`Selected: ${count}`)
  }
}
