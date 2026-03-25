import NuxtScripts from '../packages/script/src/module'
import { createResolver } from '@nuxt/kit'

const { resolve } = createResolver(import.meta.url)

export default defineNuxtConfig({
  modules: [
    NuxtScripts,
    '@nuxt/ui',
  ],

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      scripts: {
        googleSignIn: {
          clientId: '', // NUXT_PUBLIC_SCRIPTS_GOOGLE_SIGN_IN_CLIENT_ID
        },
        // Provide config values so bundler can resolve script URLs
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
        plausibleAnalytics: { domain: 'scripts.nuxt.com' },
        cloudflareWebAnalytics: { token: 'ade278253a19413c9bd923b079870902' },
        rybbitAnalytics: { siteId: '874' },
        umamiAnalytics: { websiteId: 'ae15c227-67e8-434a-831f-67e6df88bd6c' },
        databuddyAnalytics: { clientId: 'demo-client-123' },
        fathomAnalytics: { site: 'BRDEJWKJ' },
        posthog: { apiKey: 'phc_CkMaDU6dr11eJoQdAiSJb1rC324dogk3T952gJ6fD9W' },
        intercom: { app_id: 'akg5rmxb' },
        crisp: { id: 'b1021910-7ace-425a-9ef5-07f49e5ce417' },
      },
    },
  },

  nitro: {
    prerender: {
      failOnError: false,
    },
  },

  hooks: {
    'scripts:registry': function (registry) {
      registry.push({
        category: 'custom',
        label: 'My Custom Script',
        src: '/mock-custom-script.js',
        import: {
          name: 'useScriptMyCustomScript',
          from: resolve('./scripts/myCustomScript'),
        },
      })
    },
  },

  scripts: {
    debug: true,
    standaloneDevtools: true,
    registry: {
      // v1 flat config syntax: presence = infrastructure, trigger = auto-load
      // Scripts without `trigger` are composable-driven (load when composable is called)
      // Scripts with `trigger` auto-load globally on every page

      // Analytics — infrastructure only (composable driven on each page)
      googleAnalytics: { id: 'G-TR58L0EF8P', trigger: 'manual' },
      googleTagManager: { id: 'GTM-MWW974PF', trigger: 'manual' },
      plausibleAnalytics: { domain: 'scripts.nuxt.com', trigger: 'manual' },
      umamiAnalytics: { websiteId: 'ae15c227-67e8-434a-831f-67e6df88bd6c', trigger: 'manual' },
      fathomAnalytics: { site: 'BRDEJWKJ', trigger: 'manual' },
      cloudflareWebAnalytics: { token: 'ade278253a19413c9bd923b079870902', trigger: 'manual' },
      matomoAnalytics: { matomoUrl: 'https://cdn.matomo.cloud', siteId: '1', trigger: 'manual' },
      vercelAnalytics: { trigger: 'manual' },
      rybbitAnalytics: { siteId: '874', trigger: 'manual' },
      databuddyAnalytics: { clientId: 'demo-client-123', trigger: 'manual' },
      segment: { writeKey: 'KBXOGxgqMFjm2mxtJDJg0iDn5AnGYb9C', trigger: 'manual' },
      posthog: { apiKey: 'phc_CkMaDU6dr11eJoQdAiSJb1rC324dogk3T952gJ6fD9W', trigger: 'manual' },

      // Pixels — infrastructure only
      metaPixel: { id: '3925006', trigger: 'manual' },
      tiktokPixel: { id: 'TEST_PIXEL_ID', trigger: 'manual' },
      xPixel: { id: 'ol7lz', trigger: 'manual' },
      snapchatPixel: { id: '2295cbcc-cb3f-4727-8c09-1133b742722c', trigger: 'manual' },
      redditPixel: { id: 'a2_ilz4u0kbdr3v', trigger: 'manual' },
      googleAdsense: { client: 'ca-pub-1234567890', trigger: 'manual' },

      // Heatmaps & Support
      clarity: { id: 'mqk2m9dr2v', trigger: 'manual' },
      hotjar: { id: 3925006, sv: 6, trigger: 'manual' },
      intercom: { app_id: 'akg5rmxb', trigger: 'manual' },
      crisp: { id: 'b1021910-7ace-425a-9ef5-07f49e5ce417', trigger: 'manual' },

      // Media
      youtubePlayer: { trigger: 'manual' },
      vimeoPlayer: { trigger: 'manual' },

      // Maps
      googleMaps: { trigger: 'manual' },

      // Other
      gravatar: { trigger: 'manual' },
      carbonAds: { serve: 'CKYIE53L', placement: 'nuxtcom', trigger: 'manual' },
      lemonSqueezy: { trigger: 'manual' },

      // Excluded from first-party (no proxy capability) — fingerprinting required:
      // stripe, paypal, googleRecaptcha, googleSignIn
    },
  },
})
