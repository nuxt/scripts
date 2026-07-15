// One rAF fires before the next paint; two fires after it has committed to screen.
// Same pattern used by web-vitals.js — no Nuxt/Vue equivalent exists.
export function afterNextPaint(callback: () => void): () => void {
  let cancelled = false
  let innerFrame: number | undefined
  const outerFrame = requestAnimationFrame(() => {
    if (cancelled)
      return
    innerFrame = requestAnimationFrame(() => {
      if (!cancelled)
        callback()
    })
  })

  return () => {
    cancelled = true
    cancelAnimationFrame(outerFrame)
    if (innerFrame !== undefined)
      cancelAnimationFrame(innerFrame)
  }
}
