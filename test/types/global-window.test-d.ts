import type { AhrefsAnalyticsApi } from '../../packages/script/src/runtime/registry/ahrefs-analytics'
import type { CalendlyApi } from '../../packages/script/src/runtime/registry/calendly'
import type { ClarityApi } from '../../packages/script/src/runtime/registry/clarity'
import type { CloudflareWebAnalyticsApi } from '../../packages/script/src/runtime/registry/cloudflare-web-analytics'
import type { GoogleAdsenseApi } from '../../packages/script/src/runtime/registry/google-adsense'
import type { GoogleRecaptchaApi } from '../../packages/script/src/runtime/registry/google-recaptcha'
import type { GoogleTagManagerApi } from '../../packages/script/src/runtime/registry/google-tag-manager'
import type { HotjarApi } from '../../packages/script/src/runtime/registry/hotjar'
import type { IntercomApi } from '../../packages/script/src/runtime/registry/intercom'
import type { LinkedInInsightApi } from '../../packages/script/src/runtime/registry/linkedin-insight'
import type { MatomoAnalyticsApi } from '../../packages/script/src/runtime/registry/matomo-analytics'
import type { MetaPixelApi } from '../../packages/script/src/runtime/registry/meta-pixel'
import type { PayPalApi } from '../../packages/script/src/runtime/registry/paypal'
import type { RedditPixelApi } from '../../packages/script/src/runtime/registry/reddit-pixel'
import type { SegmentApi } from '../../packages/script/src/runtime/registry/segment'
import type { SnapPixelApi } from '../../packages/script/src/runtime/registry/snapchat-pixel'
import type { VimeoPlayerApi } from '../../packages/script/src/runtime/registry/vimeo-player'
import type { XPixelApi } from '../../packages/script/src/runtime/registry/x-pixel'
import type { YouTubePlayerApi } from '../../packages/script/src/runtime/registry/youtube-player'
import { describe, expectTypeOf, it } from 'vitest'

/**
 * Regression guard for #852.
 *
 * `@gtm-support/core` (the engine behind `@gtm-support/vue-gtm`) declares
 * `Window.dataLayer?: DataLayerObject[]`. Interface declarations merge, so if this package
 * also declares `dataLayer` on the global `Window`, the merged `Window` fails this package's
 * own `extends` clause. TypeScript then reports TS2430 at every one of the consumer's own
 * `Window` augmentations, which the consumer cannot suppress.
 *
 * `dataLayer` must stay off the global `Window`. Its name is configurable through the
 * `l` / `dataLayer` options anyway, so `window.dataLayer` was never guaranteed to exist.
 * The proxy returned by `useScriptGoogleTagManager()` is the supported access path.
 */
describe('global `Window` augmentation', () => {
  it('does not declare `dataLayer`', () => {
    expectTypeOf<'dataLayer' extends keyof Window ? true : false>().toEqualTypeOf<false>()
  })

  it('keeps `google_tag_manager` declared', () => {
    // `useScriptGoogleTagManager`'s `use()` reads `window.google_tag_manager` directly.
    expectTypeOf<Window['google_tag_manager']>().toEqualTypeOf<GoogleTagManagerApi['google_tag_manager']>()
  })

  it('still types `dataLayer` on the GTM proxy API', () => {
    expectTypeOf<GoogleTagManagerApi['dataLayer']>().not.toBeAny()
    expectTypeOf<GoogleTagManagerApi['dataLayer']['push']>().toBeCallableWith({ event: 'test' })
  })
})

/**
 * Follow-up sweep for #852 / #855.
 *
 * Registry entries used to reach the global `Window` through `interface Window extends XApi {}`.
 * That shape is what turns a routine member collision into an unsuppressable failure: when any
 * other package declares one of the same members, the merged `Window` stops satisfying the
 * `extends` clause, and TypeScript reports TS2430 at *every* `Window` augmentation in the
 * program — including the consumer's own, which are nowhere near the cause and which
 * `skipLibCheck` cannot silence because they are the consumer's own `.ts` files.
 *
 * Declaring the members inline removes the `extends` clause, so that failure mode cannot occur:
 * a genuine collision now surfaces as TS2687/TS2717 on the two conflicting declarations, which
 * are both in `.d.ts` files and are therefore covered by `skipLibCheck` like any other
 * dependency-vs-dependency disagreement.
 *
 * These assertions pin the member types to their API interfaces, so the rewrite stays
 * type-identical to the `extends` form it replaced and cannot silently drift.
 */
describe('registry `Window` members match their API interfaces', () => {
  it('ahrefs-analytics', () => {
    expectTypeOf<Window['AhrefsAnalytics']>().toEqualTypeOf<AhrefsAnalyticsApi['AhrefsAnalytics']>()
  })

  it('calendly', () => {
    expectTypeOf<Window['Calendly']>().toEqualTypeOf<CalendlyApi['Calendly']>()
  })

  it('clarity', () => {
    expectTypeOf<Window['clarity']>().toEqualTypeOf<ClarityApi['clarity']>()
  })

  it('cloudflare-web-analytics', () => {
    expectTypeOf<Window['__cfBeacon']>().toEqualTypeOf<CloudflareWebAnalyticsApi['__cfBeacon']>()
  })

  it('google-adsense', () => {
    expectTypeOf<Window['adsbygoogle']>().toEqualTypeOf<GoogleAdsenseApi['adsbygoogle']>()
  })

  it('google-recaptcha', () => {
    expectTypeOf<Window['grecaptcha']>().toEqualTypeOf<GoogleRecaptchaApi['grecaptcha']>()
  })

  it('hotjar', () => {
    expectTypeOf<Window['hj']>().toEqualTypeOf<HotjarApi['hj']>()
    expectTypeOf<Window['_hjSettings']>().toEqualTypeOf<{ hjid: number, hjsv?: number }>()
  })

  it('intercom', () => {
    expectTypeOf<Window['Intercom']>().toEqualTypeOf<IntercomApi['Intercom']>()
  })

  it('linkedin-insight', () => {
    expectTypeOf<Window['lintrk']>().toEqualTypeOf<LinkedInInsightApi['lintrk']>()
  })

  it('matomo-analytics', () => {
    expectTypeOf<Window['_paq']>().toEqualTypeOf<MatomoAnalyticsApi['_paq']>()
  })

  it('meta-pixel', () => {
    expectTypeOf<Window['fbq']>().toEqualTypeOf<MetaPixelApi['fbq']>()
    expectTypeOf<Window['_fbq']>().toEqualTypeOf<MetaPixelApi['_fbq']>()
    expectTypeOf<Window['callMethod']>().toEqualTypeOf<MetaPixelApi['callMethod']>()
  })

  it('paypal', () => {
    expectTypeOf<Window['paypal']>().toEqualTypeOf<PayPalApi['paypal']>()
  })

  it('reddit-pixel', () => {
    expectTypeOf<Window['rdt']>().toEqualTypeOf<RedditPixelApi['rdt']>()
  })

  it('segment', () => {
    expectTypeOf<Window['track']>().toEqualTypeOf<SegmentApi['track']>()
    expectTypeOf<Window['page']>().toEqualTypeOf<SegmentApi['page']>()
    expectTypeOf<Window['identify']>().toEqualTypeOf<SegmentApi['identify']>()
    expectTypeOf<Window['group']>().toEqualTypeOf<SegmentApi['group']>()
    expectTypeOf<Window['alias']>().toEqualTypeOf<SegmentApi['alias']>()
    expectTypeOf<Window['reset']>().toEqualTypeOf<SegmentApi['reset']>()
  })

  it('snapchat-pixel', () => {
    expectTypeOf<Window['snaptr']>().toEqualTypeOf<SnapPixelApi['snaptr']>()
    expectTypeOf<Window['_snaptr']>().toEqualTypeOf<SnapPixelApi['_snaptr']>()
    expectTypeOf<Window['handleRequest']>().toEqualTypeOf<SnapPixelApi['handleRequest']>()
  })

  it('vimeo-player', () => {
    expectTypeOf<Window['Vimeo']>().toEqualTypeOf<VimeoPlayerApi['Vimeo']>()
  })

  it('x-pixel', () => {
    expectTypeOf<Window['twq']>().toEqualTypeOf<XPixelApi['twq']>()
  })

  it('youtube-player', () => {
    expectTypeOf<Window['YT']>().toEqualTypeOf<YouTubePlayerApi['YT']>()
    expectTypeOf<Window['onYouTubeIframeAPIReady']>().toEqualTypeOf<(() => void) | undefined>()
  })

  /**
   * The inline lists above must not go stale: if an API interface gains a member, the matching
   * `Window` declaration has to gain it too, or the registry's own `window.<member>` reads stop
   * typechecking. `extends` used to keep the two in step automatically.
   *
   * `GoogleTagManagerApi` is deliberately excluded — `dataLayer` is intentionally *not* global
   * (#855), which is the one case where the two are meant to diverge.
   */
  it('declares every API member on `Window`', () => {
    expectTypeOf<Exclude<keyof AhrefsAnalyticsApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof CalendlyApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof ClarityApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof CloudflareWebAnalyticsApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof GoogleAdsenseApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof GoogleRecaptchaApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof HotjarApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof IntercomApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof LinkedInInsightApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof MatomoAnalyticsApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof MetaPixelApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof PayPalApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof RedditPixelApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof SegmentApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof SnapPixelApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof VimeoPlayerApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof XPixelApi, keyof Window>>().toEqualTypeOf<never>()
    expectTypeOf<Exclude<keyof YouTubePlayerApi, keyof Window>>().toEqualTypeOf<never>()
  })
})
