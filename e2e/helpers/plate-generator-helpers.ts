import { Page, expect } from '@playwright/test'
import { SELECTORS } from '../constants/selectors'

const PG = SELECTORS.PLATE_GENERATOR

export class PlateGeneratorHelper {
  constructor(private readonly page: Page) {}

  /** Ensure the plate generator section is expanded */
  async expandSection() {
    const collapseBtn = this.page.locator(PG.COLLAPSE_BTN)
    const isExpanded = await collapseBtn.getAttribute('aria-expanded')
    if (isExpanded === 'false') {
      await collapseBtn.click()
    }
    await expect(this.page.locator(PG.GENERATE_BTN)).toBeVisible()
  }

  /** Switch to the Outline settings tab and set outline type */
  async enableOutline(type: 'rectangular' | 'tight' = 'rectangular') {
    await this.page.locator(PG.TAB_OUTLINE).click()
    await this.page.locator(PG.OUTLINE_TYPE_SELECT).selectOption(type)
  }

  /** Click Generate and wait for the SVG preview to appear */
  async generateAndWait() {
    const generateBtn = this.page.locator(PG.GENERATE_BTN)
    await generateBtn.click()
    // Wait for button to re-enable — generation is done when it's enabled again
    await expect(generateBtn).toBeEnabled({ timeout: 30000 })
    // Confirm SVG preview rendered
    await expect(this.page.locator(PG.SVG_PREVIEW)).toBeVisible()
  }
}
