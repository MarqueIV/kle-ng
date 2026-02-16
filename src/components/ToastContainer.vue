<template>
  <Teleport to="body">
    <div class="toast-container position-fixed bottom-0 end-0 p-3">
      <ToastNotification
        v-for="toastItem in reversedToasts"
        :key="toastItem.id"
        :message="toastItem.message"
        :title="toastItem.title"
        :type="toastItem.type"
        :duration="toastItem.duration"
        :show-icon="toastItem.showIcon"
        :show-close-button="toastItem.showCloseButton"
        :action-label="toastItem.actionLabel"
        :action-url="toastItem.actionUrl"
        @close="removeToast(toastItem.id)"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { toast } from '@/composables/useToast'
import ToastNotification from './ToastNotification.vue'

const { toasts, removeToast } = toast

const reversedToasts = computed(() => [...toasts.value].reverse())
</script>
