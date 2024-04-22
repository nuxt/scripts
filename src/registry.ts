import { joinURL, withBase, withQuery } from 'ufo'
import { createResolver } from '@nuxt/kit'
import type { RegistryScripts } from '#nuxt-scripts'
import type { HotjarInput } from '~/src/runtime/registry/hotjar'
import type { IntercomInput } from '~/src/runtime/registry/intercom'
import type { SegmentInput } from '~/src/runtime/registry/segment'
import type { NpmInput } from '~/src/runtime/registry/npm'

const { resolve } = createResolver(import.meta.url)

export const registry: RegistryScripts = [
  // analytics
  {
    name: 'useScriptCloudflareWebAnalytics',
    key: 'cloudflareWebAnalytics',
    from: resolve('./runtime/registry/cloudflare-web-analytics'),
    src: 'https://static.cloudflareinsights.com/beacon.min.js',
  },
  {
    name: 'useScriptFathomAnalytics',
    key: 'fathomAnalytics',
    from: resolve('./runtime/registry/fathom-analytics'),
    src: false, // can not be bundled, breaks script
  },
  {
    name: 'useScriptMatomoAnalytics',
    key: 'matomoAnalytics',
    from: resolve('./runtime/registry/matomo-analytics'),
    src: false, // can not be bundled, breaks script
  },
  {
    name: 'useScriptGoogleAnalytics',
    key: 'googleAnalytics',
    from: resolve('./runtime/registry/google-analytics'),
  },
  // tracking
  {
    name: 'useScriptGoogleTagManager',
    key: 'googleTagManager',
    from: resolve('./runtime/registry/google-tag-manager'),
  },
  {
    name: 'useScriptSegment',
    from: resolve('./runtime/registry/segment'),
    key: 'segment',
    transform(options?: SegmentInput) {
      return joinURL('https://cdn.segment.com/analytics.js/v1', options?.writeKey || '', 'analytics.min.js')
    },
  },
  {
    name: 'useScriptFacebookPixel',
    key: 'facebookPixel',
    from: resolve('./runtime/registry/facebook-pixel'),
    src: 'https://connect.facebook.net/en_US/fbevents.js',
  },
  {
    name: 'useScriptXPixel',
    key: 'xPixel',
    from: resolve('./runtime/registry/x-pixel'),
    src: 'https://static.ads-twitter.com/uwt.js',
  },
  // payments
  {
    name: 'useScriptStripe',
    key: 'stripe',
    from: resolve('./runtime/registry/stripe'),
    src: false, // can not be bundled, breaks script
  },
  {
    name: 'useScriptLemonSqueezy',
    key: 'lemonSqueezy',
    from: resolve('./runtime/registry/lemon-squeezy'),
    src: false, // should not be bundled
  },
  // content
  {
    name: 'useScriptVimeoPlayer',
    from: resolve('./runtime/registry/vimeo-player'),
    key: 'vimeoPlayer',
  },
  {
    name: 'useScriptYouTubeIframe',
    key: 'youtubeIframe',
    from: resolve('./runtime/registry/youtube-iframe'),
  },
  {
    name: 'useScriptGoogleMaps',
    key: 'googleMaps',
    from: resolve('./runtime/registry/google-maps'),
  },
  // tools
  {
    name: 'useScriptIntercom',
    from: resolve('./runtime/registry/intercom'),
    key: 'intercom',
    transform(options?: IntercomInput) {
      return joinURL(`https://widget.intercom.io/widget`, options?.app_id || '')
    },
  },
  {
    name: 'useScriptHotjar',
    from: resolve('./runtime/registry/hotjar'),
    key: 'hotjar',
    transform(options?: HotjarInput) {
      return withQuery(`https://static.hotjar.com/c/hotjar-${options?.id || ''}.js`, {
        sv: options?.sv || '6',
      })
    },
  },
  // other
  {
    name: 'useScriptNpm',
    // key is based on package name
    from: resolve('./runtime/registry/npm'),
    transform(options?: NpmInput) {
      return withBase(options?.file || '', `https://unpkg.com/${options?.packageName || ''}@${options?.version || 'latest'}`)
    },
  },
]
