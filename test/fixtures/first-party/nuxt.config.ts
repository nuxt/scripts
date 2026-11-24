import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
  ],

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
        plausibleAnalytics: { scriptId: 'gYyxvZhkMzdzXBAtSeSNz' },
        cloudflareWebAnalytics: { token: 'ade278253a19413c9bd923b079870902' },
        rybbitAnalytics: { siteId: '874' },
        umamiAnalytics: { websiteId: 'ae15c227-67e8-434a-831f-67e6df88bd6c' },
        databuddyAnalytics: { clientId: 'demo-client-123' },
        fathomAnalytics: { site: 'BRDEJWKJ' },
        pulseAnalytics: { domain: 'example.com' },
        statableAnalytics: { siteId: '123456' },
        posthog: { apiKey: 'phc_CkMaDU6dr11eJoQdAiSJb1rC324dogk3T952gJ6fD9W' },
        intercom: { app_id: 'akg5rmxb' },
        crisp: { id: 'b1021910-7ace-425a-9ef5-07f49e5ce417' },
        vercelAnalytics: true,
        matomoAnalytics: { cloudId: 'demo.matomo.cloud', siteId: '1' },
        mixpanelAnalytics: { token: '8fa1d44274ff7526b3788cf1c119050c' },
        bingUet: { id: '247021147' },
        googleAdsense: { client: 'ca-pub-3940256099942544' },
        googleMaps: { apiKey: 'AIzaSyBtesttesttest' },
        googleRecaptcha: { siteKey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' },
        googleSignIn: { clientId: '000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com' },
        paypal: { clientId: 'test' },
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
    registry: {
      googleAnalytics: { id: 'G-TR58L0EF8P', proxy: true, trigger: 'manual' },
      googleTagManager: { id: 'GTM-MWW974PF', trigger: 'manual' },
      metaPixel: { id: '3925006', proxy: true, trigger: 'manual' },
      segment: { writeKey: 'KBXOGxgqMFjm2mxtJDJg0iDn5AnGYb9C', trigger: 'manual' },
      xPixel: { id: 'ol7lz', proxy: true, trigger: 'manual' },
      snapchatPixel: { id: '2295cbcc-cb3f-4727-8c09-1133b742722c', proxy: true, trigger: 'manual' },
      clarity: { id: 'mqk2m9dr2v', proxy: true, trigger: 'manual' },
      hotjar: { id: 3925006, sv: 6, proxy: true, trigger: 'manual' },
      tiktokPixel: { id: 'TEST_PIXEL_ID', trigger: 'manual' },
      redditPixel: { id: 'a2_ilz4u0kbdr3v', proxy: true, trigger: 'manual' },
      plausibleAnalytics: { scriptId: 'gYyxvZhkMzdzXBAtSeSNz', proxy: true, trigger: 'manual' },
      cloudflareWebAnalytics: { token: 'ade278253a19413c9bd923b079870902', trigger: 'manual' },
      rybbitAnalytics: { siteId: '874', proxy: true, trigger: 'manual' },
      umamiAnalytics: { websiteId: 'ae15c227-67e8-434a-831f-67e6df88bd6c', proxy: true, trigger: 'manual' },
      databuddyAnalytics: { clientId: 'demo-client-123', proxy: true, trigger: 'manual' },
      fathomAnalytics: { site: 'BRDEJWKJ', trigger: 'manual' },
      pulseAnalytics: { domain: 'example.com', trigger: 'manual' },
      statableAnalytics: { siteId: '123456', trigger: 'manual' },
      posthog: { apiKey: 'phc_CkMaDU6dr11eJoQdAiSJb1rC324dogk3T952gJ6fD9W', proxy: true, trigger: 'manual' },
      intercom: { app_id: 'akg5rmxb', proxy: true, trigger: 'manual' },
      crisp: { id: 'b1021910-7ace-425a-9ef5-07f49e5ce417', trigger: 'manual' },
      vercelAnalytics: { proxy: true, trigger: 'manual' },
      matomoAnalytics: { cloudId: 'demo.matomo.cloud', siteId: '1', proxy: true, trigger: 'manual' },
      mixpanelAnalytics: { token: '8fa1d44274ff7526b3788cf1c119050c', trigger: 'manual' },
      bingUet: { id: '247021147', trigger: 'manual' },
      googleAdsense: { client: 'ca-pub-3940256099942544', proxy: true, trigger: 'manual' },
      carbonAds: { trigger: 'manual' },
      vimeoPlayer: { proxy: true, trigger: 'manual' },
      youtubePlayer: { proxy: true, trigger: 'manual' },
      npm: { packageName: 'js-confetti', file: 'dist/js-confetti.browser.js', version: '0.12.0', trigger: 'manual' },
      gravatar: { proxy: true, trigger: 'manual' },
      lemonSqueezy: { trigger: 'manual' },
      stripe: { trigger: 'manual' },
      googleMaps: { apiKey: 'AIzaSyBtesttesttest', trigger: 'manual' },
      googleRecaptcha: { siteKey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI', trigger: 'manual' },
      googleSignIn: { clientId: '000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com', trigger: 'manual' },
      paypal: { clientId: 'test', sandbox: true, trigger: 'manual' },
    },
  },
})
