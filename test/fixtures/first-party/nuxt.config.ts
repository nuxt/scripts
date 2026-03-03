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
      plausibleAnalytics: { domain: 'scripts.nuxt.com' },
      cloudflareWebAnalytics: { token: 'ade278253a19413c9bd923b079870902' },
      rybbitAnalytics: { analyticsId: '874' },
      umamiAnalytics: { websiteId: 'demo-website-id-123' },
      databuddyAnalytics: { id: 'demo-client-123' },
      fathomAnalytics: { site: 'BRDEJWKJ' },
      posthog: { apiKey: 'phc_CkMaDU6dr11eJoQdAiSJb1rC324dogk3T952gJ6fD9W' },
      intercom: { app_id: 'akg5rmxb' },
      crisp: { id: 'b1021910-7ace-425a-9ef5-07f49e5ce417' },
    },
  },
})
