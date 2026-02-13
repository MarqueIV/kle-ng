<template>
  <BaseHelpModal :is-visible="isVisible" title="Manufacturing Properties - Help" @close="close">
    <div class="help-section">
      <h6 class="help-section-title">Placeholder</h6>
      <div class="help-content">
        <p>Help content will be added later.</p>
      </div>
    </div>
  </BaseHelpModal>
</template>

<script setup lang="ts">
import BaseHelpModal from './BaseHelpModal.vue'

interface Props {
  isVisible: boolean
}

interface Emits {
  (e: 'close'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const close = () => {
  emit('close')
}
</script>
