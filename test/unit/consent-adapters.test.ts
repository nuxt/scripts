import { describe, expect, it, vi } from 'vitest'
import {
  bingUetConsentAdapter,
  clarityConsentAdapter,
  googleAnalyticsConsentAdapter,
  metaPixelConsentAdapter,
  tiktokPixelConsentAdapter,
} from '../../packages/script/src/runtime/registry/consent-adapters'

describe('consent adapters — GCMv2 to vendor projection', () => {
  it('tikTok: ad_storage maps to grantConsent / revokeConsent / holdConsent', () => {
    const grantConsent = vi.fn()
    const revokeConsent = vi.fn()
    const holdConsent = vi.fn()
    const proxy: any = { ttq: { grantConsent, revokeConsent, holdConsent } }

    tiktokPixelConsentAdapter.applyUpdate({ ad_storage: 'granted' }, proxy)
    expect(grantConsent).toHaveBeenCalledTimes(1)

    tiktokPixelConsentAdapter.applyUpdate({ ad_storage: 'denied' }, proxy)
    expect(revokeConsent).toHaveBeenCalledTimes(1)

    // applyUpdate with undecided is a no-op -- preserves the prior decision.
    tiktokPixelConsentAdapter.applyUpdate({}, proxy)
    expect(grantConsent).toHaveBeenCalledTimes(1)
    expect(revokeConsent).toHaveBeenCalledTimes(1)
    expect(holdConsent).not.toHaveBeenCalled()

    // applyDefault with undecided holds so tracking is deferred.
    tiktokPixelConsentAdapter.applyDefault({}, proxy)
    expect(holdConsent).toHaveBeenCalledTimes(1)
  })

  it('meta: ad_storage maps to fbq("consent", grant|revoke)', () => {
    const fbq = vi.fn()
    const proxy: any = { fbq }

    metaPixelConsentAdapter.applyDefault({ ad_storage: 'granted' }, proxy)
    expect(fbq).toHaveBeenLastCalledWith('consent', 'grant')

    metaPixelConsentAdapter.applyUpdate({ ad_storage: 'denied' }, proxy)
    expect(fbq).toHaveBeenLastCalledWith('consent', 'revoke')

    metaPixelConsentAdapter.applyDefault({}, proxy)
    expect(fbq).toHaveBeenCalledTimes(2)
  })

  it('google analytics: full GCM state passes through to gtag', () => {
    const gtag = vi.fn()
    const proxy: any = { gtag }
    const state = { ad_storage: 'granted' as const, analytics_storage: 'denied' as const }

    googleAnalyticsConsentAdapter.applyDefault(state, proxy)
    expect(gtag).toHaveBeenLastCalledWith('consent', 'default', state)

    googleAnalyticsConsentAdapter.applyUpdate(state, proxy)
    expect(gtag).toHaveBeenLastCalledWith('consent', 'update', state)
  })

  it('bing uet: ad_storage only, pushes through uetq', () => {
    const push = vi.fn()
    const proxy: any = { uetq: { push } }

    bingUetConsentAdapter.applyDefault({ ad_storage: 'denied', analytics_storage: 'granted' }, proxy)
    expect(push).toHaveBeenCalledWith('consent', 'default', { ad_storage: 'denied' })

    bingUetConsentAdapter.applyUpdate({ ad_storage: 'granted' }, proxy)
    expect(push).toHaveBeenLastCalledWith('consent', 'update', { ad_storage: 'granted' })

    bingUetConsentAdapter.applyDefault({}, proxy)
    expect(push).toHaveBeenCalledTimes(2)
  })

  it('clarity: analytics_storage maps to clarity("consent", boolean)', () => {
    const clarity = vi.fn()
    const proxy: any = { clarity }

    clarityConsentAdapter.applyDefault({ analytics_storage: 'granted' }, proxy)
    expect(clarity).toHaveBeenLastCalledWith('consent', true)

    clarityConsentAdapter.applyUpdate({ analytics_storage: 'denied' }, proxy)
    expect(clarity).toHaveBeenLastCalledWith('consent', false)

    clarityConsentAdapter.applyDefault({}, proxy)
    expect(clarity).toHaveBeenCalledTimes(2)
  })
})
