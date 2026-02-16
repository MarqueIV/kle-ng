declare module 'bootstrap/js/dist/toast' {
  class Toast {
    constructor(
      element: Element,
      options?: {
        animation?: boolean
        autohide?: boolean
        delay?: number
      },
    )
    show(): void
    hide(): void
    dispose(): void
    static getInstance(element: Element): Toast | null
  }
  export default Toast
}
