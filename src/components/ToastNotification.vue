<template>
  <div
    ref="toastEl"
    class="toast fade"
    :class="`toast-${type}`"
    role="alert"
    aria-live="polite"
    aria-atomic="true"
  >
    <div class="toast-header">
      <BiCheckCircleFill v-if="type === 'success'" class="toast-type-icon me-2" />
      <BiExclamationTriangleFill v-else-if="type === 'error'" class="toast-type-icon me-2" />
      <BiExclamationTriangleFill v-else-if="type === 'warning'" class="toast-type-icon me-2" />
      <BiInfoCircleFill v-else class="toast-type-icon me-2" />
      <strong v-if="title" class="me-auto">{{ title }}</strong>
      <span v-else class="me-auto">{{ typeLabel }}</span>
      <button
        v-if="showCloseButton"
        type="button"
        class="btn-close"
        data-bs-dismiss="toast"
        aria-label="Close notification"
      />
    </div>
    <div class="toast-body">
      {{ message }}
      <div v-if="actionLabel && actionUrl" class="mt-2 text-center">
        <a
          :href="actionUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-sm btn-warning fw-semibold d-inline-flex align-items-center gap-1"
          @click="handleAction"
        >
          <BiGithub v-if="actionUrl.includes('github')" />
          {{ actionLabel }}
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import BsToast from 'bootstrap/js/dist/toast'
import type { ToastProps } from '@/composables/useToast'
import BiCheckCircleFill from 'bootstrap-icons/icons/check-circle-fill.svg'
import BiExclamationTriangleFill from 'bootstrap-icons/icons/exclamation-triangle-fill.svg'
import BiInfoCircleFill from 'bootstrap-icons/icons/info-circle-fill.svg'
import BiGithub from 'bootstrap-icons/icons/github.svg'

const props = withDefaults(defineProps<ToastProps>(), {
  type: 'info',
  duration: 4000,
  showIcon: true,
  showCloseButton: true,
})

const emit = defineEmits<{
  close: []
}>()

const toastEl = ref<HTMLElement | null>(null)

const typeLabel = computed(() => {
  const labels: Record<string, string> = {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
  }
  return labels[props.type] || 'Info'
})

const handleAction = () => {
  if (!toastEl.value) return
  const instance = BsToast.getInstance(toastEl.value)
  instance?.hide()
}

onMounted(() => {
  if (!toastEl.value) return
  const instance = new BsToast(toastEl.value, {
    autohide: props.duration > 0,
    delay: props.duration,
    animation: true,
  })
  instance.show()

  toastEl.value.addEventListener('hidden.bs.toast', () => {
    emit('close')
  })
})
</script>

<style scoped>
.toast {
  --bs-toast-bg: var(--bs-body-bg);
}

.toast-success .toast-type-icon,
.toast-success :deep(.toast-header strong) {
  color: var(--bs-success);
}

.toast-error .toast-type-icon,
.toast-error :deep(.toast-header strong) {
  color: var(--bs-danger);
}

.toast-warning .toast-type-icon,
.toast-warning :deep(.toast-header strong) {
  color: var(--bs-warning-text);
}

.toast-info .toast-type-icon,
.toast-info :deep(.toast-header strong) {
  color: var(--bs-info);
}
</style>
