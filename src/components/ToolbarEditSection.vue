<template>
  <div class="toolbar-section">
    <label class="section-label">Edit</label>
    <div class="tool-buttons">
      <!-- Add Key Button Group -->
      <div class="btn-group-vertical add-key-group dropend">
        <button
          class="tool-button primary-add-btn"
          data-testid="toolbar-add-key"
          @click="$emit('add-key')"
          title="Add Standard Key"
        >
          <BiPlusCircle />
        </button>
        <button
          class="tool-button dropdown-btn dropdown-toggle"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          title="Add Special Key"
        >
          <BiChevronDown />
        </button>
        <ul class="dropdown-menu">
          <li v-for="specialKey in specialKeys" :key="specialKey.name">
            <button
              class="dropdown-item"
              @click="$emit('add-special-key', specialKey)"
              :title="specialKey.description"
            >
              {{ specialKey.name }}
            </button>
          </li>
        </ul>
      </div>

      <button
        class="tool-button"
        data-testid="toolbar-delete-keys"
        @click="$emit('delete-keys')"
        :disabled="!canDelete"
        title="Delete Keys"
      >
        <BiTrash />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type SpecialKeyTemplate } from '@/data/specialKeys'
import BiPlusCircle from 'bootstrap-icons/icons/plus-circle.svg'
import BiChevronDown from 'bootstrap-icons/icons/chevron-down.svg'
import BiTrash from 'bootstrap-icons/icons/trash.svg'

defineProps<{
  specialKeys: SpecialKeyTemplate[]
  canDelete: boolean
}>()

defineEmits<{
  'add-key': []
  'add-special-key': [specialKey: SpecialKeyTemplate]
  'delete-keys': []
}>()
</script>

<style scoped>
.add-key-group .dropdown-toggle::after {
  display: none;
}
</style>
