import { ref } from 'vue'

export interface ToastProps {
  message: string
  title?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  showIcon?: boolean
  showCloseButton?: boolean
  actionLabel?: string
  actionUrl?: string
  onClose?: () => void
}

export interface Toast extends ToastProps {
  id: string
}

const toasts = ref<Toast[]>([])
let nextId = 1

export function useToast() {
  const showToast = (options: Omit<Toast, 'id'>) => {
    const toast: Toast = {
      id: `toast-${nextId++}`,
      type: 'info',
      duration: 4000,
      showIcon: true,
      showCloseButton: true,
      ...options,
    }

    toasts.value.push(toast)
    return toast.id
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex((toast) => toast.id === id)
    if (index > -1) {
      const removed = toasts.value.splice(index, 1)[0]
      removed?.onClose?.()
    }
  }

  const clearToasts = () => {
    toasts.value = []
  }

  // Convenience methods for different toast types
  const showSuccess = (message: string, title?: string, options?: Partial<Toast>) => {
    return showToast({
      message,
      title,
      type: 'success',
      ...options,
    })
  }

  const showError = (message: string, title?: string, options?: Partial<Toast>) => {
    return showToast({
      message,
      title,
      type: 'error',
      duration: 6000, // Longer duration for errors
      ...options,
    })
  }

  const showWarning = (message: string, title?: string, options?: Partial<Toast>) => {
    return showToast({
      message,
      title,
      type: 'warning',
      duration: 5000,
      ...options,
    })
  }

  const showInfo = (message: string, title?: string, options?: Partial<Toast>) => {
    return showToast({
      message,
      title,
      type: 'info',
      ...options,
    })
  }

  return {
    toasts,
    showToast,
    removeToast,
    clearToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }
}

// Global toast instance for use throughout the app
export const toast = useToast()

// Expose toast globally for e2e testing
if (typeof window !== 'undefined') {
  ;(window as typeof window & { __kleToast: typeof toast }).__kleToast = toast
}
