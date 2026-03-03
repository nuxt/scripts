import { defineNuxtConfig } from 'nuxt/config'

// trigger: 'manual' prevents the auto-generated plugin from loading all 18
// scripts globally on every page. Each page's composable call then overrides
// the trigger and loads only its own script, eliminating cross-provider noise.
const manual = { trigger: 'manual' as const }

export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
  ],

  // The module merges registry into runtimeConfig.public.scripts via defu, but
  // [input, options] arrays don't spread correctly. Explicit objects here ensure
  // the bundler's registryConfig lookup gets proper {key: value} objects.
  runtimeConfig: {
    public: {
      scripts: {
        googleAnalytics: { id: 'G-TR58L0EF8P' },
        googleTagManager: { id: 'GTM-MWW974PF' },
        metaPixel: { id: '3925006' },
        segment: { writeKey: 'KBXOGxgqMFjm2mxtJDJg0iDn5AnGYb9C' },
        xPixel: { id: 'ol7lz' },
        snapchatPixel: { id: '2295cbcc-cb3f-4727-8c09-1133b742722c' },
        clarity: { id: 'mqk2m9dr2v' },
        hotjar: { id: 3925006, sv: 6 },
        tiktokPixel: { id: 'TEST_PIXEL_ID' },
        redditPixel: { id: 't2_test_advertiser_id' },
        plausibleAnalytics: { domain: 'example.com' },
        cloudflareWebAnalytics: { token: 'test-token' },
        rybbitAnalytics: { analyticsId: 'test-id' },
        umamiAnalytics: { websiteId: 'test-id' },
        databuddyAnalytics: { id: 'test-id' },
        fathomAnalytics: { site: 'TEST' },
        intercom: { app_id: 'test-app' },
        crisp: { id: 'test-id' },
      },
    },
  },

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
    firstParty: true,
    registry: {
      googleAnalytics: [{ id: 'G-TR58L0EF8P' }, manual],
      googleTagManager: [{ id: 'GTM-MWW974PF' }, manual],
      metaPixel: [{ id: '3925006' }, manual],
      segment: [{ writeKey: 'KBXOGxgqMFjm2mxtJDJg0iDn5AnGYb9C' }, manual],
      xPixel: [{ id: 'ol7lz' }, manual],
      snapchatPixel: [{ id: '2295cbcc-cb3f-4727-8c09-1133b742722c' }, manual],
      clarity: [{ id: 'mqk2m9dr2v' }, manual],
      hotjar: [{ id: 3925006, sv: 6 }, manual],
      tiktokPixel: [{ id: 'TEST_PIXEL_ID' }, manual],
      redditPixel: [{ id: 't2_test_advertiser_id' }, manual],
      plausibleAnalytics: [{ domain: 'example.com' }, manual],
      cloudflareWebAnalytics: [{ token: 'test-token' }, manual],
      rybbitAnalytics: [{ analyticsId: 'test-id' }, manual],
      umamiAnalytics: [{ websiteId: 'test-id' }, manual],
      databuddyAnalytics: [{ id: 'test-id' }, manual],
      fathomAnalytics: [{ site: 'TEST' }, manual],
      intercom: [{ app_id: 'test-app' }, manual],
      crisp: [{ id: 'test-id' }, manual],
    },
  },
})
