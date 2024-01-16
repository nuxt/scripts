Object.defineProperty(window, 'requestIdleCallback', {
  writable: true,
  value(cb: any) {
    const start = Date.now()
    const timeoutId = window.setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining() {
          return Math.max(0, 50 - (Date.now() - start))
        },
      })
    }, 1)

    return timeoutId
  },
})
