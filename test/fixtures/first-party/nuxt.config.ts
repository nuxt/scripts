import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
  ],

  compatibilityDate: '2024-07-05',

  scripts: {
    firstParty: {
      privacy: 'anonymize', // Test with anonymize mode by default
    },
    // Wait for SW to be ready before loading scripts that need interception
    defaultScriptOptions: {
      trigger: { serviceWorker: true },
    },
    registry: {
      googleAnalytics: {
        id: 'G-TR58L0EF8P',
      },
      googleTagManager: {
        id: 'GTM-MWW974PF',
      },
      metaPixel: {
        id: '3925006',
      },
      segment: {
        writeKey: 'KBXOGxgqMFjm2mxtJDJg0iDn5AnGYb9C',
      },
      xPixel: {
        id: 'ol7lz',
      },
      snapchatPixel: {
        id: '2295cbcc-cb3f-4727-8c09-1133b742722c',
      },
      clarity: {
        id: 'mqk2m9dr2v',
      },
      hotjar: {
        id: 3925006,
        sv: 6,
      },
      tiktokPixel: {
        id: 'TEST_PIXEL_ID',
      },
      redditPixel: {
        id: 't2_test_advertiser_id',
      },
    },
  },
})
