import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import ColorPicker from '../ColorPicker.vue'
import * as recentlyUsedColorsModule from '../../utils/recently-used-colors'

const mockRefreshRecentlyUsedColors = vi.hoisted(() => vi.fn())

// Mock CustomColorPicker
vi.mock('../CustomColorPicker.vue', () => ({
  default: {
    name: 'CustomColorPicker',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    setup() {
      return {
        refreshRecentlyUsedColors: mockRefreshRecentlyUsedColors,
      }
    },
    template: `
      <div class="custom-color-picker-mock">
        <button
          @click="$emit('update:modelValue', '#ff0000')"
          data-testid="mock-color-change"
        >
          Change Color
        </button>
      </div>
    `,
  },
}))

// Mock recently used colors manager
vi.mock('../../utils/recently-used-colors', () => ({
  recentlyUsedColorsManager: {
    getRecentlyUsedColors: vi.fn(() => []),
    addColor: vi.fn(),
    clear: vi.fn(),
  },
}))

// Get references to the mocked functions
const mockRecentlyUsedColorsManager = vi.mocked(recentlyUsedColorsModule.recentlyUsedColorsManager)

// Teleported popup renders into document.body outside the component root — use document.querySelector
const getInPopup = (selector: string): Element => {
  const el = document.querySelector(selector)
  if (!el) throw new Error(`Element not found in teleported popup: ${selector}`)
  return el
}

describe('ColorPicker', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()

    wrapper = mount(ColorPicker, {
      props: {
        modelValue: '#000000',
      },
      attachTo: document.body,
    })
  })

  afterEach(() => {
    wrapper.unmount()
  })

  describe('Recently Used Colors Tracking', () => {
    it('does not track color during selection', async () => {
      await wrapper.find('.color-picker-button').trigger('click')
      await wrapper.vm.$nextTick()

      getInPopup('[data-testid="mock-color-change"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
      await wrapper.vm.$nextTick()

      expect(mockRecentlyUsedColorsManager.addColor).not.toHaveBeenCalled()
    })

    it('tracks color when OK button is clicked', async () => {
      await wrapper.find('.color-picker-button').trigger('click')
      await wrapper.vm.$nextTick()

      getInPopup('[data-testid="mock-color-change"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
      await wrapper.vm.$nextTick()

      getInPopup('.btn-primary').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(mockRecentlyUsedColorsManager.addColor).toHaveBeenCalledWith('#ff0000')
    })

    it('does not track color when Cancel button is clicked', async () => {
      await wrapper.find('.color-picker-button').trigger('click')
      await wrapper.vm.$nextTick()

      getInPopup('[data-testid="mock-color-change"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
      await wrapper.vm.$nextTick()

      getInPopup('.btn-secondary').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(mockRecentlyUsedColorsManager.addColor).not.toHaveBeenCalled()
    })

    it('tracks color when pressing Enter key', async () => {
      await wrapper.find('.color-picker-button').trigger('click')
      await wrapper.vm.$nextTick()

      getInPopup('[data-testid="mock-color-change"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
      await wrapper.vm.$nextTick()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      await wrapper.vm.$nextTick()

      expect(mockRecentlyUsedColorsManager.addColor).toHaveBeenCalledWith('#ff0000')
    })

    it('does not track color when pressing Escape key', async () => {
      await wrapper.find('.color-picker-button').trigger('click')
      await wrapper.vm.$nextTick()

      getInPopup('[data-testid="mock-color-change"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
      await wrapper.vm.$nextTick()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await wrapper.vm.$nextTick()

      expect(mockRecentlyUsedColorsManager.addColor).not.toHaveBeenCalled()
    })

    it('refreshes CustomColorPicker recently used colors after accepting', async () => {
      await wrapper.find('.color-picker-button').trigger('click')
      await wrapper.vm.$nextTick()

      getInPopup('[data-testid="mock-color-change"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
      await wrapper.vm.$nextTick()

      getInPopup('.btn-primary').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(mockRefreshRecentlyUsedColors).toHaveBeenCalledTimes(1)
    })
  })

  describe('Component Behavior', () => {
    it('opens and closes picker correctly', async () => {
      expect(document.querySelector('.color-picker-popup')).toBeNull()

      await wrapper.find('.color-picker-button').trigger('click')
      await wrapper.vm.$nextTick()
      expect(document.querySelector('.color-picker-popup')).not.toBeNull()

      getInPopup('.btn-primary').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wrapper.vm.$nextTick()
      expect(document.querySelector('.color-picker-popup')).toBeNull()
    })

    it('updates color value during selection', async () => {
      await wrapper.find('.color-picker-button').trigger('click')
      await wrapper.vm.$nextTick()

      getInPopup('[data-testid="mock-color-change"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['#ff0000'])
    })

    it('emits events when accepting changes', async () => {
      await wrapper.find('.color-picker-button').trigger('click')
      await wrapper.vm.$nextTick()

      getInPopup('[data-testid="mock-color-change"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
      await wrapper.vm.$nextTick()

      getInPopup('.btn-primary').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('change')).toBeTruthy()
      expect(wrapper.emitted('input')).toBeTruthy()
      expect(wrapper.emitted('change')![0]).toEqual(['#ff0000'])
      expect(wrapper.emitted('input')![0]).toEqual(['#ff0000'])
    })

    it('emits update:modelValue from acceptChanges so v-model syncs before @change fires', async () => {
      await wrapper.find('.color-picker-button').trigger('click')
      await wrapper.vm.$nextTick()

      getInPopup('[data-testid="mock-color-change"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
      await wrapper.vm.$nextTick()

      const countBeforeOk = wrapper.emitted('update:modelValue')?.length ?? 0

      getInPopup('.btn-primary').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wrapper.vm.$nextTick()

      const allUpdateEmissions = wrapper.emitted('update:modelValue')!
      expect(allUpdateEmissions.length).toBe(countBeforeOk + 1)
      expect(allUpdateEmissions[allUpdateEmissions.length - 1]).toEqual(['#ff0000'])
    })

    it('emits update:modelValue from acceptChanges even without prior color interaction', async () => {
      await wrapper.find('.color-picker-button').trigger('click')
      await wrapper.vm.$nextTick()

      getInPopup('.btn-primary').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wrapper.vm.$nextTick()

      const updateEmissions = wrapper.emitted('update:modelValue')!
      expect(updateEmissions).toBeTruthy()
      expect(updateEmissions[updateEmissions.length - 1]).toEqual(['#000000'])
    })

    it('restores original value when canceling', async () => {
      const originalColor = '#000000'

      await wrapper.find('.color-picker-button').trigger('click')
      await wrapper.vm.$nextTick()

      getInPopup('[data-testid="mock-color-change"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
      await wrapper.vm.$nextTick()

      getInPopup('.btn-secondary').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('change')).toBeTruthy()
      expect(wrapper.emitted('input')).toBeTruthy()
      const finalEmissions = wrapper.emitted('change')!
      expect(finalEmissions[finalEmissions.length - 1]).toEqual([originalColor])
    })
  })
})
