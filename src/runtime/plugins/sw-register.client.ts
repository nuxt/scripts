import { defineNuxtPlugin } from 'nuxt/app'

// Injected at build time
declare const SW_PATH: string

export default defineNuxtPlugin({
  name: 'nuxt-scripts:sw-register',
  enforce: 'pre',
  async setup() {
    if (!('serviceWorker' in navigator))
      return

    // Register the service worker
    await navigator.serviceWorker.register(SW_PATH, { scope: '/' })
      .catch((err) => {
        console.warn('[nuxt-scripts] Service worker registration failed:', err)
      })
  },
})
