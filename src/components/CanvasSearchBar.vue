<template>
  <!-- @mousedown.stop / @click.stop: KeyboardCanvas has container-level @mousedown and
       @click handlers that call event.preventDefault() / canvasRef.focus() for any
       click that does not originate from the canvas element itself. Without these
       modifiers, clicking inside the search bar would trigger those handlers and
       immediately steal focus back to the canvas. -->
  <div class="canvas-search-bar" role="search" @keydown="onKeyDown" @mousedown.stop @click.stop>
    <input
      ref="inputRef"
      type="text"
      class="search-input"
      placeholder="Search labels..."
      :value="query"
      @input="onInput"
      @keydown.enter.exact.prevent="$emit('next')"
      @keydown.shift.enter.prevent="$emit('previous')"
      @keydown.escape.prevent="$emit('close')"
      aria-label="Search key labels"
    />

    <span
      class="search-count"
      :class="{ 'text-danger': hasQuery && matchCount === 0 }"
      aria-live="polite"
    >
      {{ countDisplay }}
    </span>

    <button
      type="button"
      class="search-btn"
      aria-label="Previous match"
      :disabled="matchCount === 0"
      @click="$emit('previous')"
    >
      <BiChevronUp />
    </button>

    <button
      type="button"
      class="search-btn"
      aria-label="Next match"
      :disabled="matchCount === 0"
      @click="$emit('next')"
    >
      <BiChevronDown />
    </button>

    <button type="button" class="search-btn" aria-label="Close search" @click="$emit('close')">
      <BiX />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import BiX from 'bootstrap-icons/icons/x.svg'
import BiChevronUp from 'bootstrap-icons/icons/chevron-up.svg'
import BiChevronDown from 'bootstrap-icons/icons/chevron-down.svg'

defineProps<{
  matchCount: number
  countDisplay: string
  hasQuery: boolean
  query: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'next'): void
  (e: 'previous'): void
  (e: 'query-change', value: string): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  // setTimeout (macrotask) rather than nextTick (microtask): this component mounts
  // during a keyboard event (Ctrl+F). Vue microtasks (nextTick) are processed before
  // the browser finishes the current event's propagation and default actions, so
  // calling focus() inside nextTick fires while the keydown event is still being
  // dispatched — the canvas blur/focus handlers then run and steal focus back.
  // A macrotask (setTimeout 0) is queued after the entire event pipeline completes,
  // so focus lands on the input and stays there.
  setTimeout(() => inputRef.value?.focus(), 0)
})

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('query-change', target.value)
}

// Stop canvas keyboard shortcuts from firing while the search bar is active,
// but let Tab/Shift+Tab pass through so keyboard users can leave the component
// naturally (WCAG 2.1 SC 2.1.2 — No Keyboard Trap).
function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Tab') {
    event.stopPropagation()
  }
}
</script>

<style scoped>
/* Bar is offset so the X button (rightmost) sits exactly over the trigger
   button: right = trigger_right(8) - bar_border(1) - bar_padding(4) = 3px,
   same calculation applies to top. */
.canvas-search-bar {
  position: absolute;
  top: 3px;
  right: 3px;
  z-index: 1100;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.search-input {
  width: 160px;
  font-size: 0.8rem;
  /* Vertical padding chosen so the input height matches the buttons (padding: 5px
     + 1px border on each side → same total height as the trigger button). */
  padding: 2px 6px;
  color: var(--bs-body-color);
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 3px;
  outline: none;
}

.search-input:focus {
  border-color: var(--bs-primary, #0d6efd);
}

.search-count {
  /* Fixed width wide enough to hold "No matches" — prevents the bar from
     resizing as the result count changes. */
  width: 72px;
  flex-shrink: 0;
  font-size: 0.7rem;
  color: var(--bs-secondary-color);
  white-space: nowrap;
  text-align: center;
}

.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  /* padding: 5px matches .canvas-search-trigger so all buttons are the same size */
  padding: 5px;
  border: 1px solid var(--bs-border-color);
  border-radius: 3px;
  background: var(--bs-secondary-bg);
  color: var(--bs-body-color);
  cursor: pointer;
  line-height: 1;
  font-size: 0.875rem;
}

.search-btn:hover:not(:disabled) {
  background: var(--bs-border-color);
}

.search-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
