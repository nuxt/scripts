/**
 * Consent Mode — verifies each script fires its vendor-specific consent call
 * inside `clientInit` BEFORE the vendor init / first tracking call.
 *
 * Runs inside the nuxt (browser-like) environment so `import.meta.client` is true
 * and the module-level `_paq`/`window` initialisation takes the client branch.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Force useRegistryScript to a pass-through so we can call `clientInit` directly
// instead of going through the real beforeInit wrapping (which requires the full
// Nuxt + useScript plumbing).
vi.mock('#nuxt-scripts/utils', () => ({
  useRegistryScript: (_key: string, optionsFn: any, userOptions?: any) => {
    const opts = optionsFn(userOptions || {}, { scriptInput: userOptions?.scriptInput })
    return { _opts: opts, proxy: opts.scriptOptions?.use?.() }
  },
}))

vi.mock('../../packages/script/src/runtime/utils', () => ({
  useRegistryScript: (_key: string, optionsFn: any, userOptions?: any) => {
    const opts = optionsFn(userOptions || {}, { scriptInput: userOptions?.scriptInput })
    return { _opts: opts, proxy: opts.scriptOptions?.use?.() }
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

  it('mixpanel: opt-in queues opt_in_tracking AFTER init', async () => {
    const { useScriptMixpanelAnalytics } = await import('../../packages/script/src/runtime/registry/mixpanel-analytics')

    const seq: string[] = []
    const initSpy = vi.fn(() => { seq.push('init') })
    const mp: any = []
    const origPush = Array.prototype.push.bind(mp)
    mp.push = (arg: any) => {
      if (Array.isArray(arg))
        seq.push(`push:${arg[0]}`)
      else seq.push('push:other')
      return origPush(arg)
    }
    mp.__SV = 1.2
    mp._i = []
    mp.init = initSpy
    ;(window as any).mixpanel = mp

    const result: any = useScriptMixpanelAnalytics({
      token: 'tok_xyz',
      defaultConsent: 'opt-in',
    })
    result._opts.clientInit()

    const cfg = initSpy.mock.calls[0]?.[1]
    expect(cfg?.opt_out_tracking_by_default).toBeUndefined()

    expect(seq.indexOf('init')).toBeGreaterThanOrEqual(0)
    expect(seq.indexOf('push:opt_in_tracking')).toBeGreaterThan(seq.indexOf('init'))
  })

  it('posthog: opt-out sets opt_out_capturing_by_default on init config', async () => {
    const posthogInit = vi.fn(() => ({ opt_in_capturing: vi.fn() }))
    vi.doMock('posthog-js', () => ({ default: { init: posthogInit } }))
    vi.resetModules()

    const { useScriptPostHog } = await import('../../packages/script/src/runtime/registry/posthog')

    const result: any = useScriptPostHog({
      apiKey: 'phc_xxx',
      defaultConsent: 'opt-out',
    })
    await result._opts.clientInit()
    await (window as any).__posthogInitPromise

    expect(posthogInit).toHaveBeenCalledTimes(1)
    const [key, config] = posthogInit.mock.calls[0] as any[]
    expect(key).toBe('phc_xxx')
    expect(config).toMatchObject({ opt_out_capturing_by_default: true })
  })

  it('posthog: opt-in calls opt_in_capturing AFTER init returns', async () => {
    const optInSpy = vi.fn()
    const instance = { opt_in_capturing: optInSpy }
    const posthogInit = vi.fn(() => {
      expect(optInSpy).not.toHaveBeenCalled()
      return instance
    })
    vi.doMock('posthog-js', () => ({ default: { init: posthogInit } }))
    vi.resetModules()

    const { useScriptPostHog } = await import('../../packages/script/src/runtime/registry/posthog')

    const result: any = useScriptPostHog({
      apiKey: 'phc_xxx',
      defaultConsent: 'opt-in',
    })
    await result._opts.clientInit()
    await (window as any).__posthogInitPromise

    expect(posthogInit).toHaveBeenCalledTimes(1)
    expect(optInSpy).toHaveBeenCalledTimes(1)
  })
})

describe('consentAdapter contract', () => {
  it('matomo adapter: granted pushes setConsentGiven; denied pushes forgetConsentGiven', async () => {
    const { registry } = await import('../../packages/script/src/registry')
    const all = await registry()
    const matomo = all.find(s => s.registryKey === 'matomoAnalytics')!
    expect(matomo.consentAdapter).toBeDefined()

    const _paq: any[] = []
    matomo.consentAdapter!.applyUpdate({ analytics_storage: 'granted' }, { _paq })
    matomo.consentAdapter!.applyUpdate({ analytics_storage: 'denied' }, { _paq })

    expect(_paq).toEqual([['setConsentGiven'], ['forgetConsentGiven']])
  })

  it('mixpanel adapter: granted calls opt_in_tracking; denied calls opt_out_tracking', async () => {
    const { registry } = await import('../../packages/script/src/registry')
    const all = await registry()
    const mp = all.find(s => s.registryKey === 'mixpanelAnalytics')!
    const optIn = vi.fn()
    const optOut = vi.fn()
    const mixpanel = { opt_in_tracking: optIn, opt_out_tracking: optOut }

    mp.consentAdapter!.applyUpdate({ analytics_storage: 'granted' }, { mixpanel })
    expect(optIn).toHaveBeenCalledOnce()

    mp.consentAdapter!.applyUpdate({ analytics_storage: 'denied' }, { mixpanel })
    expect(optOut).toHaveBeenCalledOnce()
  })

  it('posthog adapter: granted calls opt_in_capturing; denied calls opt_out_capturing', async () => {
    const { registry } = await import('../../packages/script/src/registry')
    const all = await registry()
    const ph = all.find(s => s.registryKey === 'posthog')!
    const optIn = vi.fn()
    const optOut = vi.fn()
    const posthog = { opt_in_capturing: optIn, opt_out_capturing: optOut }

    ph.consentAdapter!.applyUpdate({ analytics_storage: 'granted' }, { posthog })
    expect(optIn).toHaveBeenCalledOnce()

    ph.consentAdapter!.applyUpdate({ analytics_storage: 'denied' }, { posthog })
    expect(optOut).toHaveBeenCalledOnce()
  })

  it('gtm adapter: default pushes ["consent","default",state]; update pushes ["consent","update",state]', async () => {
    const { registry } = await import('../../packages/script/src/registry')
    const all = await registry()
    const gtm = all.find(s => s.registryKey === 'googleTagManager')!
    const dataLayer: any[] = []

    gtm.consentAdapter!.applyDefault({ analytics_storage: 'denied' }, { dataLayer })
    gtm.consentAdapter!.applyUpdate({ analytics_storage: 'granted' }, { dataLayer })

    expect(dataLayer).toEqual([
      ['consent', 'default', { analytics_storage: 'denied' }],
      ['consent', 'update', { analytics_storage: 'granted' }],
    ])
  })
})
