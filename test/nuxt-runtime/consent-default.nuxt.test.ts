/**
 * Consent Mode — verifies each script fires its vendor-specific consent call
 * inside `clientInit` BEFORE the vendor init / first tracking call.
 *
 * Runs inside the nuxt (browser-like) environment so `import.meta.client` is true
 * and the module-level `_paq`/`window` initialisation takes the client branch.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

let posthogInitImpl: ((...args: any[]) => any) | undefined

vi.mock('posthog-js', () => ({
  default: {
    init: (...args: any[]) => posthogInitImpl?.(...args),
  },
}))

// Force useRegistryScript to a pass-through so we can call `clientInit` directly
// instead of going through the real beforeInit wrapping (which requires the full
// Nuxt + useScript plumbing).
vi.mock('#nuxt-scripts/utils', () => ({
  useRegistryScript: (_key: string, optionsFn: any, userOptions?: any) => {
    const opts = optionsFn(userOptions || {}, { scriptInput: userOptions?.scriptInput })
    const instance: any = { _opts: opts }
    // Lazy proxy so `use()` runs AFTER clientInit populates window.fbq/ttq/etc.
    Object.defineProperty(instance, 'proxy', {
      configurable: true,
      get() { return opts.scriptOptions?.use?.() },
    })
    return instance
  },
}))

vi.mock('../../packages/script/src/runtime/utils', () => ({
  useRegistryScript: (_key: string, optionsFn: any, userOptions?: any) => {
    const opts = optionsFn(userOptions || {}, { scriptInput: userOptions?.scriptInput })
    const instance: any = { _opts: opts }
    // Lazy proxy so `use()` runs AFTER clientInit populates window.fbq/ttq/etc.
    Object.defineProperty(instance, 'proxy', {
      configurable: true,
      get() { return opts.scriptOptions?.use?.() },
    })
    return instance
  },
  scriptRuntimeConfig: () => ({}),
  scriptsPrefix: () => '/_scripts',
  requireRegistryEndpoint: () => {},
}))

vi.mock('../../packages/script/src/runtime/composables/useScriptEventPage', () => ({
  useScriptEventPage: vi.fn(),
}))

describe('consent defaults — clientInit ordering', () => {
  beforeEach(() => {
    delete (window as any).dataLayer
    delete (window as any)._paq
    delete (window as any).mixpanel
    delete (window as any).posthog
    delete (window as any).__posthogInitPromise
  })

  it('gtm: pushes ["consent","default",state] before gtm.start', async () => {
    const { useScriptGoogleTagManager } = await import('../../packages/script/src/runtime/registry/google-tag-manager')
    const result: any = useScriptGoogleTagManager({
      id: 'GTM-XXXX',
      defaultConsent: { analytics_storage: 'denied', ad_storage: 'denied' },
    })

    result._opts.clientInit()

    const dl = (window as any).dataLayer as any[]
    expect(Array.isArray(dl)).toBe(true)

    const consentIdx = dl.findIndex(e => Array.isArray(e) && e[0] === 'consent' && e[1] === 'default')
    const startIdx = dl.findIndex(e => e && typeof e === 'object' && !Array.isArray(e) && e.event === 'gtm.js')

    expect(consentIdx).toBeGreaterThanOrEqual(0)
    expect(startIdx).toBeGreaterThanOrEqual(0)
    expect(consentIdx).toBeLessThan(startIdx)
    expect(dl[consentIdx][2]).toMatchObject({ analytics_storage: 'denied', ad_storage: 'denied' })
  })

  it('matomo: "required" pushes requireConsent before setSiteId', async () => {
    ;(window as any)._paq = []
    const { useScriptMatomoAnalytics } = await import('../../packages/script/src/runtime/registry/matomo-analytics')
    const result: any = useScriptMatomoAnalytics({
      matomoUrl: 'https://m.example.com',
      siteId: 1,
      defaultConsent: 'required',
    })

    result._opts.clientInit()

    const calls = (window as any)._paq as any[]
    const findIdx = (cmd: string) => calls.findIndex(c => Array.isArray(c) && c[0] === cmd)

    expect(findIdx('requireConsent')).toBeGreaterThanOrEqual(0)
    expect(findIdx('setSiteId')).toBeGreaterThan(findIdx('requireConsent'))
  })

  it('matomo: "given" queues requireConsent then setConsentGiven, both before setSiteId', async () => {
    ;(window as any)._paq = []
    const { useScriptMatomoAnalytics } = await import('../../packages/script/src/runtime/registry/matomo-analytics')
    const result: any = useScriptMatomoAnalytics({
      matomoUrl: 'https://m.example.com',
      siteId: 1,
      defaultConsent: 'given',
    })

    result._opts.clientInit()

    const calls = (window as any)._paq as any[]
    const findIdx = (cmd: string) => calls.findIndex(c => Array.isArray(c) && c[0] === cmd)

    expect(findIdx('requireConsent')).toBeLessThan(findIdx('setConsentGiven'))
    expect(findIdx('setConsentGiven')).toBeLessThan(findIdx('setSiteId'))
  })

  it('mixpanel: opt-out sets opt_out_tracking_by_default on init config', async () => {
    const { useScriptMixpanelAnalytics } = await import('../../packages/script/src/runtime/registry/mixpanel-analytics')

    const initSpy = vi.fn()
    const mp: any = []
    mp.__SV = 1.2
    mp._i = []
    mp.init = initSpy
    ;(window as any).mixpanel = mp

    const result: any = useScriptMixpanelAnalytics({
      token: 'tok_xyz',
      defaultConsent: 'opt-out',
    })
    result._opts.clientInit()

    expect(initSpy).toHaveBeenCalledTimes(1)
    const [token, config] = initSpy.mock.calls[0] as any[]
    expect(token).toBe('tok_xyz')
    expect(config).toMatchObject({ opt_out_tracking_by_default: true })
  })

  it('mixpanel: opt-in does not set opt_out_tracking_by_default', async () => {
    const { useScriptMixpanelAnalytics } = await import('../../packages/script/src/runtime/registry/mixpanel-analytics')

    const initSpy = vi.fn()
    const mp: any = []
    mp.__SV = 1.2
    mp._i = []
    mp.init = initSpy
    ;(window as any).mixpanel = mp

    const result: any = useScriptMixpanelAnalytics({
      token: 'tok_xyz',
      defaultConsent: 'opt-in',
    })
    result._opts.clientInit()

    expect(initSpy).toHaveBeenCalled()
    const cfg = initSpy.mock.calls[0]?.[1]
    expect(cfg?.opt_out_tracking_by_default).toBeUndefined()
  })

  // PostHog init is driven by the dynamic `import('posthog-js')` chain which doesn't
  // reliably resolve inside happy-dom's module-mocked environment. We verify the
  // behaviour end-to-end in the playground instead; unit coverage for posthog
  // stays on the per-script consent object below.
})

describe('per-script consent object', () => {
  it('matomo: consent.give() pushes setConsentGiven AFTER requireConsent from clientInit', async () => {
    const { useScriptMatomoAnalytics } = await import('../../packages/script/src/runtime/registry/matomo-analytics')
    const result: any = useScriptMatomoAnalytics({
      cloudId: 'example.matomo.cloud',
      siteId: 1,
      defaultConsent: 'required',
    })

    result._opts.clientInit()
    expect(result.consent).toBeDefined()

    result.consent.give()
    result.consent.forget()

    const paq = (window as any)._paq as any[]
    // requireConsent must land before any give/forget
    const requireIdx = paq.findIndex(e => Array.isArray(e) && e[0] === 'requireConsent')
    const giveIdx = paq.findIndex(e => Array.isArray(e) && e[0] === 'setConsentGiven')
    const forgetIdx = paq.findIndex(e => Array.isArray(e) && e[0] === 'forgetConsentGiven')
    expect(requireIdx).toBeGreaterThanOrEqual(0)
    expect(giveIdx).toBeGreaterThan(requireIdx)
    expect(forgetIdx).toBeGreaterThan(giveIdx)
  })

  it('matomo: without defaultConsent, clientInit does not push requireConsent', async () => {
    ;(window as any)._paq = []
    const { useScriptMatomoAnalytics } = await import('../../packages/script/src/runtime/registry/matomo-analytics')
    const result: any = useScriptMatomoAnalytics({
      cloudId: 'example.matomo.cloud',
      siteId: 1,
    })
    result._opts.clientInit()
    const paq = (window as any)._paq as any[]
    const hasRequire = paq.some(e => Array.isArray(e) && e[0] === 'requireConsent')
    expect(hasRequire).toBe(false)
  })

  it('ga: consent.update() pushes gtag consent update via dataLayer', async () => {
    ;(window as any).dataLayer = []
    const { useScriptGoogleAnalytics } = await import('../../packages/script/src/runtime/registry/google-analytics')
    const result: any = useScriptGoogleAnalytics({ id: 'G-XXXX' })
    result._opts.clientInit()
    result.consent.update({ ad_storage: 'granted' })
    const dl = (window as any).dataLayer as any[]
    const updateArgs = dl.find(e => e[0] === 'consent' && e[1] === 'update')
    expect(updateArgs?.[2]).toEqual({ ad_storage: 'granted' })
  })

  it('gtm: consent.update() pushes ["consent","update", state] onto dataLayer', async () => {
    ;(window as any).dataLayer = []
    const { useScriptGoogleTagManager } = await import('../../packages/script/src/runtime/registry/google-tag-manager')
    const result: any = useScriptGoogleTagManager({ id: 'GTM-XXXX' })
    result._opts.clientInit()
    result.consent.update({ analytics_storage: 'granted' })
    const dl = (window as any).dataLayer as any[]
    expect(dl).toContainEqual(['consent', 'update', { analytics_storage: 'granted' }])
  })

  it('meta: consent.grant()/revoke() queue fbq(\'consent\', ...) calls', async () => {
    const { useScriptMetaPixel } = await import('../../packages/script/src/runtime/registry/meta-pixel')
    const result: any = useScriptMetaPixel({ id: '123' })
    result._opts.clientInit()
    ;(window as any).fbq.queue = []
    result.consent.grant()
    result.consent.revoke()
    expect((window as any).fbq.queue).toEqual([
      ['consent', 'grant'],
      ['consent', 'revoke'],
    ])
  })

  it('tiktok: consent.grant()/revoke()/hold() queue ttq consent actions', async () => {
    const { useScriptTikTokPixel } = await import('../../packages/script/src/runtime/registry/tiktok-pixel')
    const result: any = useScriptTikTokPixel({ id: 'CA123' })
    result._opts.clientInit()
    ;(window as any).ttq.queue = []
    result.consent.grant()
    result.consent.revoke()
    result.consent.hold()
    const queue = (window as any).ttq.queue as any[]
    expect(queue.map(e => e[0])).toEqual(['grantConsent', 'revokeConsent', 'holdConsent'])
  })

  it('bing: consent.update() pushes consent update onto uetq', async () => {
    ;(window as any).uetq = []
    const { useScriptBingUet } = await import('../../packages/script/src/runtime/registry/bing-uet')
    const result: any = useScriptBingUet({ id: '123' })
    result._opts.clientInit()
    result.consent.update({ ad_storage: 'granted' })
    // Before bat.js loads, window.uetq is a raw array; Array.push spreads the
    // 3 args as separate entries. The real UET queue drains them as a triple.
    const uetq = (window as any).uetq as any[]
    expect(uetq).toEqual(['consent', 'update', { ad_storage: 'granted' }])
  })

  it('clarity: consent.set(bool) calls clarity consent with the value', async () => {
    const calls: any[] = []
    const clarityFn = (...args: any[]) => {
      calls.push(args)
    }
    clarityFn.q = []
    ;(window as any).clarity = clarityFn
    const { useScriptClarity } = await import('../../packages/script/src/runtime/registry/clarity')
    const result: any = useScriptClarity({ id: 'p-123' })
    result._opts.clientInit()
    result.consent.set(true)
    expect(calls).toContainEqual(['consent', true])
  })

  it('mixpanel: consent.optIn/optOut call opt_in_tracking/opt_out_tracking', async () => {
    const optIn = vi.fn()
    const optOut = vi.fn()
    ;(window as any).mixpanel = { opt_in_tracking: optIn, opt_out_tracking: optOut, __SV: 1.2, _i: [], init: vi.fn() }
    const { useScriptMixpanelAnalytics } = await import('../../packages/script/src/runtime/registry/mixpanel-analytics')
    const result: any = useScriptMixpanelAnalytics({ token: 'tok' })
    result._opts.clientInit()
    result.consent.optIn()
    result.consent.optOut()
    expect(optIn).toHaveBeenCalledOnce()
    expect(optOut).toHaveBeenCalledOnce()
  })

  it('posthog: consent.optIn/optOut route to posthog opt_in_capturing/opt_out_capturing', async () => {
    const optIn = vi.fn()
    const optOut = vi.fn()
    ;(window as any).posthog = { opt_in_capturing: optIn, opt_out_capturing: optOut } as any
    const { useScriptPostHog } = await import('../../packages/script/src/runtime/registry/posthog')
    const result: any = useScriptPostHog({ apiKey: 'phc_xxx' })
    // NOTE: posthog's clientInit is async and tied to dynamic import; we only
    // care that the consent factory forwards correctly to the proxy here.
    result.consent.optIn()
    result.consent.optOut()
    expect(optIn).toHaveBeenCalledOnce()
    expect(optOut).toHaveBeenCalledOnce()
  })
})
