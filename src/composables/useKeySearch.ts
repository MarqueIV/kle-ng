import { ref, computed, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { Key } from '@adamws/kle-serial'
import { labelParser } from '@/utils/parsers/LabelParser'

function keyMatchesQuery(key: Key, query: string): boolean {
  const q = query.toLowerCase()
  for (const label of key.labels) {
    if (!label) continue
    const nodes = labelParser.parse(label)
    const text = labelParser.getPlainText(nodes)
    if (text.toLowerCase().includes(q)) return true
  }
  return false
}

export interface UseKeySearch {
  isSearchOpen: Ref<boolean>
  searchQuery: Ref<string>
  matchingKeys: ComputedRef<Key[]>
  currentMatchKey: ComputedRef<Key | null>
  matchCount: ComputedRef<number>
  matchCountDisplay: ComputedRef<string>
  setKeys: (keys: Key[]) => void
  openSearch: () => void
  closeSearch: () => void
  nextMatch: () => void
  previousMatch: () => void
}

/**
 * Composable for canvas label search state and navigation.
 *
 * Creates **local, non-shared** reactive state — each call returns an
 * independent instance. Do not call this in multiple components expecting
 * shared search state; use a Pinia store for that instead.
 */
export function useKeySearch(): UseKeySearch {
  const isSearchOpen = ref(false)
  const searchQuery = ref('')
  const currentMatchIndex = ref(0)
  const allKeys = ref<Key[]>([])

  const matchingKeys = computed<Key[]>(() => {
    if (!searchQuery.value.trim()) return []
    return allKeys.value.filter((key) => keyMatchesQuery(key, searchQuery.value.trim()))
  })

  // Clamp index when matches shrink (e.g. key deleted while search open) — kept
  // out of the computed getter to avoid a circular reactive dependency.
  watch(matchingKeys, (keys) => {
    if (keys.length > 0 && currentMatchIndex.value >= keys.length) {
      currentMatchIndex.value = 0
    }
  })

  // Reset navigation index whenever the query changes. flush:'sync' ensures the
  // reset happens synchronously during the same tick as the searchQuery mutation,
  // so any caller that reads currentMatchKey immediately after setting searchQuery
  // always gets index 0 without needing to call a separate reset method.
  watch(
    searchQuery,
    () => {
      currentMatchIndex.value = 0
    },
    { flush: 'sync' },
  )

  const currentMatchKey = computed<Key | null>(() => {
    const keys = matchingKeys.value
    if (keys.length === 0) return null
    return keys[currentMatchIndex.value] ?? null
  })

  const matchCount = computed<number>(() => matchingKeys.value.length)

  const matchCountDisplay = computed<string>(() => {
    if (!searchQuery.value.trim()) return ''
    if (matchingKeys.value.length === 0) return 'No matches'
    return `${currentMatchIndex.value + 1} / ${matchingKeys.value.length}`
  })

  function setKeys(keys: Key[]): void {
    allKeys.value = keys
  }

  function openSearch(): void {
    isSearchOpen.value = true
  }

  function closeSearch(): void {
    isSearchOpen.value = false
    searchQuery.value = ''
    currentMatchIndex.value = 0
  }

  function nextMatch(): void {
    const count = matchingKeys.value.length
    if (count === 0) return
    currentMatchIndex.value = (currentMatchIndex.value + 1) % count
  }

  function previousMatch(): void {
    const count = matchingKeys.value.length
    if (count === 0) return
    currentMatchIndex.value = (currentMatchIndex.value - 1 + count) % count
  }

  return {
    isSearchOpen,
    searchQuery,
    matchingKeys,
    currentMatchKey,
    matchCount,
    matchCountDisplay,
    setKeys,
    openSearch,
    closeSearch,
    nextMatch,
    previousMatch,
  }
}
