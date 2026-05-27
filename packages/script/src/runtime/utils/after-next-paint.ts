// One rAF fires before the next paint; two fires after it has committed to screen.
// Same pattern used by web-vitals.js — no Nuxt/Vue equivalent exists.
export function afterNextPaint(callback: () => void): void {
  requestAnimationFrame(() => requestAnimationFrame(callback))
}
