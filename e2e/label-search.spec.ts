/**
 * E2E tests for the Canvas Label Search feature.
 *
 * The search bar is a floating overlay inside the canvas container. It can be
 * opened via a trigger button or the "/" shortcut while the canvas has focus,
 * and closed via the close button, Escape, or "/" again.
 *
 * Screenshot tests are limited to Chromium because canvas pixel output is
 * identical across browsers (verified separately) and cross-browser PNG
 * baselines would diverge.
 */

import { test, expect } from '@playwright/test'
import { CanvasTestHelper } from './helpers/canvas-test-helpers'
import { WaitHelpers } from './helpers/wait-helpers'
import { LabelSearchHelper } from './helpers/label-search-helpers'

/** Four keys with distinct labels — "Ctrl" appears exactly once. */
const LAYOUT_FOUR_UNIQUE = JSON.stringify([['Ctrl', 'Alt', 'Shift', 'Tab']])

/** Six keys where "Ctrl" appears three times and "Alt" twice — for navigation tests. */
const LAYOUT_REPEATED_LABELS = JSON.stringify([['Ctrl', 'Alt', 'Ctrl', 'Shift', 'Ctrl', 'Alt']])

test.describe('Label Search', () => {
  let helper: CanvasTestHelper
  let search: LabelSearchHelper
  let wait: WaitHelpers

  test.beforeEach(async ({ page }) => {
    helper = new CanvasTestHelper(page)
    wait = new WaitHelpers(page)
    search = new LabelSearchHelper(page, wait)
    await page.goto('/')
  })

  // ---------------------------------------------------------------------------
  // Matching and count display
  // ---------------------------------------------------------------------------

  test('search query highlights matches, updates count, and resets correctly', async () => {
    await helper.loadJsonLayout(LAYOUT_FOUR_UNIQUE)
    await helper.waitForRender()
    await helper.getCanvas().focus()
    await search.openViaKeyboard()
    await search.expectInputFocused()

    // Case-insensitive: "ctrl" matches "Ctrl"
    await search.typeQuery('ctrl')
    await search.expectCountDisplay('1 / 1')
    await search.expectNavButtonsEnabled()
    await search.expectSelectedCount(1)

    // Clearing the query removes all match state
    await search.clearQuery()
    await search.expectCountEmpty()
    await search.expectNavButtonsDisabled()
    await search.expectSelectedCount(0)

    // No-match state: red "No matches" text, nav disabled, nothing selected
    await search.typeQuery('ZZZZZ')
    await search.expectNoMatches()
    await search.expectNavButtonsDisabled()
    await search.expectSelectedCount(0)
  })

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  test('next/prev navigation wraps through all matches; index resets on query change', async () => {
    await helper.loadJsonLayout(LAYOUT_REPEATED_LABELS)
    await helper.waitForRender()
    await helper.getCanvas().focus()
    await search.openViaKeyboard()
    await search.typeQuery('Ctrl')
    await search.expectCountDisplay('1 / 3')

    // Forward: button, keyboard shortcut, then wrap-around
    await search.clickNext()
    await search.expectCountDisplay('2 / 3')
    await search.pressEnterForNext()
    await search.expectCountDisplay('3 / 3')
    await search.clickNext()
    await search.expectCountDisplay('1 / 3') // wrapped

    // Backward: wrap from first to last, then keyboard shortcut
    await search.clickPrev()
    await search.expectCountDisplay('3 / 3') // wrapped
    await search.pressShiftEnterForPrev()
    await search.expectCountDisplay('2 / 3')

    // Changing the query resets the index to 1
    await search.typeQuery('Alt')
    await search.expectCountDisplay('1 / 2') // "Alt" appears twice
  })

  // ---------------------------------------------------------------------------
  // Close behaviour
  // ---------------------------------------------------------------------------

  test('closing search retains the last selected match; Escape then deselects normally', async ({
    page,
  }) => {
    await helper.loadJsonLayout(LAYOUT_REPEATED_LABELS)
    await helper.waitForRender()
    await helper.getCanvas().focus()
    await search.openViaKeyboard()
    await search.typeQuery('Ctrl')
    await search.clickNext()
    await search.expectCountDisplay('2 / 3')

    // Close via button — last navigated key stays selected
    await search.closeViaEscape()
    await search.expectClosed()
    await search.expectSelectedCount(1)
    await expect(helper.getCanvas()).toBeFocused()

    // Escape on canvas now deselects rather than re-opening search
    await page.keyboard.press('Escape')
    await wait.waitForAnimationFrames(2)
    await search.expectClosed()
    await search.expectSelectedCount(0)
  })

  // ---------------------------------------------------------------------------
  // Keyboard shortcut isolation
  // ---------------------------------------------------------------------------

  test('keystrokes typed in the search input do not trigger canvas shortcuts', async ({ page }) => {
    await helper.loadJsonLayout(LAYOUT_FOUR_UNIQUE)
    await helper.waitForRender()
    await helper.getCanvas().focus()
    await search.openViaKeyboard()

    // "delete" typed as search text must not fire the canvas Delete shortcut
    const keyCountBefore = await page.getByTestId('counter-keys').textContent()
    await search.typeQuery('delete')
    expect(await page.getByTestId('counter-keys').textContent()).toBe(keyCountBefore)
    await expect(search.getInput()).toHaveValue('delete')
  })

  // ---------------------------------------------------------------------------
  // Live layout updates
  // ---------------------------------------------------------------------------

  test('replacing the layout while search is open updates results live', async () => {
    await helper.loadJsonLayout(LAYOUT_REPEATED_LABELS)
    await helper.waitForRender()
    await helper.getCanvas().focus()
    await search.openViaButton() // open with a button at least once in tests
    await search.typeQuery('Ctrl')
    await search.expectCountDisplay('1 / 3')

    // Layout with fewer matches — count shrinks
    await helper.loadJsonLayout(LAYOUT_FOUR_UNIQUE)
    await helper.waitForRender()
    await wait.waitForAnimationFrames(4)
    await search.expectCountDisplay('1 / 1')

    // Layout with no matching keys — transitions to no-match state
    await helper.loadJsonLayout(JSON.stringify([['Q', 'W', 'E', 'R']]))
    await helper.waitForRender()
    await wait.waitForAnimationFrames(4)
    await search.expectNoMatches()
    await search.expectNavButtonsDisabled()
  })

  // ---------------------------------------------------------------------------
  // Canvas rendering (Chromium only)
  // ---------------------------------------------------------------------------

  test.describe('Canvas rendering', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only')

    test('matched keys are highlighted; current match is distinct; highlights clear on close', async () => {
      await helper.loadJsonLayout(LAYOUT_REPEATED_LABELS)
      await helper.waitForRender()
      await helper.getCanvas().focus()
      await search.openViaKeyboard()
      await search.typeQuery('Ctrl')
      await wait.waitForAnimationFrames(4)

      // All three "Ctrl" keys highlighted; first is the current match
      await expect(helper.getCanvas()).toHaveScreenshot('search-matches-at-first.png')

      // Navigate to second match — it should appear distinct from the others
      await search.clickNext()
      await wait.waitForAnimationFrames(4)
      await expect(helper.getCanvas()).toHaveScreenshot('search-matches-at-second.png')

      // After closing, amber highlights disappear; only normal selected-key style remains
      await search.closeViaButton()
      await wait.waitForAnimationFrames(4)
      await expect(helper.getCanvas()).toHaveScreenshot('search-closed-highlights-cleared.png')
    })
  })
})
