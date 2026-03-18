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
        redditPixel: { id: 'a2_ilz4u0kbdr3v' },
        plausibleAnalytics: { domain: 'scripts.nuxt.com', extension: 'local' },
        cloudflareWebAnalytics: { token: 'ade278253a19413c9bd923b079870902' },
        rybbitAnalytics: { siteId: '874' },
        umamiAnalytics: { websiteId: 'ae15c227-67e8-434a-831f-67e6df88bd6c' },
        databuddyAnalytics: { clientId: 'demo-client-123' },
        fathomAnalytics: { site: 'BRDEJWKJ' },
        posthog: { apiKey: 'phc_CkMaDU6dr11eJoQdAiSJb1rC324dogk3T952gJ6fD9W' },
        intercom: { app_id: 'akg5rmxb' },
        crisp: { id: 'b1021910-7ace-425a-9ef5-07f49e5ce417' },
        vercelAnalytics: true,
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
      redditPixel: [{ id: 'a2_ilz4u0kbdr3v' }, manual],
      plausibleAnalytics: [{ domain: 'scripts.nuxt.com', extension: 'local' }, manual],
      cloudflareWebAnalytics: [{ token: 'ade278253a19413c9bd923b079870902' }, manual],
      rybbitAnalytics: [{ siteId: '874' }, manual],
      umamiAnalytics: [{ websiteId: 'ae15c227-67e8-434a-831f-67e6df88bd6c' }, manual],
      databuddyAnalytics: [{ clientId: 'demo-client-123' }, manual],
      fathomAnalytics: [{ site: 'BRDEJWKJ' }, manual],
      posthog: [{ apiKey: 'phc_CkMaDU6dr11eJoQdAiSJb1rC324dogk3T952gJ6fD9W' }, manual],
      intercom: [{ app_id: 'akg5rmxb' }, manual],
      crisp: [{ id: 'b1021910-7ace-425a-9ef5-07f49e5ce417' }, manual],
      vercelAnalytics: [true, manual],
    },
  },
})
