import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  compatibilityDate: '2026-11-25',
  hooks: {
    'scripts:registry'(registry) {
      const analytics = registry.find(script => script.registryKey === 'cloudflareWebAnalytics')!
      analytics.src = 'data:text/javascript,void%200'
    },
  },
})
