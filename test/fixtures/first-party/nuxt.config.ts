import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
  ],

  compatibilityDate: '2024-07-05',

  // Force unhead to be bundled into the server code instead of externalized.
  // Nitro's external tracing misses some unhead subpath exports (server, utils)
  // which causes ERR_MODULE_NOT_FOUND in the test build output.
  nitro: {
    externals: {
      inline: ['unhead'],
    },
  },

  scripts: {
    firstParty: true, // Uses per-script privacy defaults from registry
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
