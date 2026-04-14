import { beforeEach, describe, expect, it, vi } from 'vitest'

// Ensure import.meta.client is truthy in tests so useRegistryScript fires clientInit via beforeInit.
;

(import.meta as any).client = true

// Mock runtime config + useScript to capture clientInit and return the options
vi.mock('nuxt/app', () => ({
  useRuntimeConfig: () => ({ public: { scripts: {} } }),
}))

vi.mock('../../packages/script/src/runtime/composables/useScript', () => ({
  useScript: vi.fn((_input: any, options: any) => ({ input: _input, options, proxy: {} })),
}))

async function invokeClientInit(run: () => any) {
  // run the script composable; captured options carry the clientInit via beforeInit wrapper
  const result: any = run()
  const beforeInit = result?.options?.beforeInit
  expect(typeof beforeInit).toBe('function')
  await beforeInit()
  return result
}

describe('defaultConsent - TikTok Pixel', () => {
  beforeEach(() => {
    ;(globalThis as any).window = {}
  })

  it('fires grantConsent before init when defaultConsent="granted"', async () => {
    const { useScriptTikTokPixel } = await import('../../packages/script/src/runtime/registry/tiktok-pixel')
    await invokeClientInit(() => useScriptTikTokPixel({ id: 'TEST_ID', defaultConsent: 'granted' }))

    const ttq = (globalThis as any).window.ttq
    expect(ttq).toBeDefined()
    // Queue should contain grantConsent call before 'init'
    const queue: any[] = ttq.queue
    const grantIdx = queue.findIndex(c => c[0] === 'grantConsent')
    const initIdx = queue.findIndex(c => c[0] === 'init')
    expect(grantIdx).toBeGreaterThan(-1)
    expect(initIdx).toBeGreaterThan(-1)
    expect(grantIdx).toBeLessThan(initIdx)
  })

  it('fires revokeConsent when defaultConsent="denied"', async () => {
    const { useScriptTikTokPixel } = await import('../../packages/script/src/runtime/registry/tiktok-pixel')
    await invokeClientInit(() => useScriptTikTokPixel({ id: 'TEST_ID', defaultConsent: 'denied' }))

    const ttq = (globalThis as any).window.ttq
    const queue: any[] = ttq.queue
    expect(queue.some(c => c[0] === 'revokeConsent')).toBe(true)
  })

  it('does not fire consent when defaultConsent is unset', async () => {
    const { useScriptTikTokPixel } = await import('../../packages/script/src/runtime/registry/tiktok-pixel')
    await invokeClientInit(() => useScriptTikTokPixel({ id: 'TEST_ID' }))
    const ttq = (globalThis as any).window.ttq
    const queue: any[] = ttq.queue
    expect(queue.some(c => c[0] === 'grantConsent' || c[0] === 'revokeConsent')).toBe(false)
  })
})

describe('defaultConsent - Meta Pixel', () => {
  beforeEach(() => {
    ;(globalThis as any).window = {}
  })

  it('fires fbq("consent", "grant") before fbq("init", id)', async () => {
    const { useScriptMetaPixel } = await import('../../packages/script/src/runtime/registry/meta-pixel')
    await invokeClientInit(() => useScriptMetaPixel({ id: '123', defaultConsent: 'granted' }))

    const fbq = (globalThis as any).window.fbq
    const queue: any[] = fbq.queue
    const consentIdx = queue.findIndex(c => c[0] === 'consent' && c[1] === 'grant')
    const initIdx = queue.findIndex(c => c[0] === 'init')
    expect(consentIdx).toBeGreaterThan(-1)
    expect(initIdx).toBeGreaterThan(-1)
    expect(consentIdx).toBeLessThan(initIdx)
  })

  it('fires fbq("consent", "revoke") when denied', async () => {
    const { useScriptMetaPixel } = await import('../../packages/script/src/runtime/registry/meta-pixel')
    await invokeClientInit(() => useScriptMetaPixel({ id: '123', defaultConsent: 'denied' }))
    const fbq = (globalThis as any).window.fbq
    const queue: any[] = fbq.queue
    expect(queue.some(c => c[0] === 'consent' && c[1] === 'revoke')).toBe(true)
  })
})

describe('defaultConsent - Google Analytics', () => {
  beforeEach(() => {
    ;(globalThis as any).window = {}
  })

  it('fires gtag("consent", "default", state) before gtag("js", ...)', async () => {
    const { useScriptGoogleAnalytics } = await import('../../packages/script/src/runtime/registry/google-analytics')
    await invokeClientInit(() =>
      useScriptGoogleAnalytics({
        id: 'G-TEST',
        defaultConsent: { ad_storage: 'denied', analytics_storage: 'granted' },
      }),
    )

    const dataLayer: any[] = (globalThis as any).window.dataLayer
    // gtag pushes `arguments` objects onto dataLayer
    const asArrays = dataLayer.map(a => Array.from(a as ArrayLike<any>))
    const consentIdx = asArrays.findIndex(a => a[0] === 'consent' && a[1] === 'default')
    const jsIdx = asArrays.findIndex(a => a[0] === 'js')
    expect(consentIdx).toBeGreaterThan(-1)
    expect(jsIdx).toBeGreaterThan(-1)
    expect(consentIdx).toBeLessThan(jsIdx)
    expect(asArrays[consentIdx][2]).toEqual({ ad_storage: 'denied', analytics_storage: 'granted' })
  })
})

describe('defaultConsent - Bing UET', () => {
  beforeEach(() => {
    ;(globalThis as any).window = {}
  })

  it('pushes ["consent","default", state] before any other push', async () => {
    const { useScriptBingUet } = await import('../../packages/script/src/runtime/registry/bing-uet')
    await invokeClientInit(() =>
      useScriptBingUet({
        id: 'UET-TEST',
        defaultConsent: { ad_storage: 'denied' },
        onBeforeUetStart: (uetq) => {
          // simulate a user-provided push after defaultConsent
          ;(uetq as any).push('pageLoad')
        },
      }),
    )

    const uetq: any[] = (globalThis as any).window.uetq as any
    // variadic push appends each arg separately on a plain array (matches Microsoft's
    // snippet; UET's queue processor handles this form on hydration)
    expect(uetq[0]).toBe('consent')
    expect(uetq[1]).toBe('default')
    expect(uetq[2]).toEqual({ ad_storage: 'denied' })
    // followed by the onBeforeUetStart push
    expect(uetq[3]).toBe('pageLoad')
  })
})

describe('defaultConsent - Clarity', () => {
  beforeEach(() => {
    ;(globalThis as any).window = {}
  })

  it('calls clarity("consent", value) in clientInit', async () => {
    const { useScriptClarity } = await import('../../packages/script/src/runtime/registry/clarity')
    await invokeClientInit(() =>
      useScriptClarity({ id: 'clarity-id-12345', defaultConsent: false }),
    )

    const clarity: any = (globalThis as any).window.clarity
    // queue on clarity.q contains [ ["consent", false] ]
    expect(clarity.q).toBeDefined()
    expect(clarity.q.some((c: any[]) => c[0] === 'consent' && c[1] === false)).toBe(true)
  })

  it('supports advanced consent vector object', async () => {
    const { useScriptClarity } = await import('../../packages/script/src/runtime/registry/clarity')
    await invokeClientInit(() =>
      useScriptClarity({
        id: 'clarity-id-12345',
        defaultConsent: { ad_storage: 'denied', analytics_storage: 'granted' },
      }),
    )

    const clarity: any = (globalThis as any).window.clarity
    const consentCall = clarity.q.find((c: any[]) => c[0] === 'consent')
    expect(consentCall?.[1]).toEqual({ ad_storage: 'denied', analytics_storage: 'granted' })
  })
})

describe('consentAdapter - per-script projection', () => {
  it('tikTok adapter maps ad_storage to grantConsent/revokeConsent', async () => {
    const { tiktokPixelConsentAdapter } = await import('../../packages/script/src/runtime/registry/consent-adapters')
    const grant = vi.fn()
    const revoke = vi.fn()
    const proxy: any = { ttq: { grantConsent: grant, revokeConsent: revoke } }

    tiktokPixelConsentAdapter.applyUpdate({ ad_storage: 'granted' }, proxy)
    expect(grant).toHaveBeenCalled()

    tiktokPixelConsentAdapter.applyUpdate({ ad_storage: 'denied' }, proxy)
    expect(revoke).toHaveBeenCalled()
  })

  it('meta adapter maps ad_storage to fbq("consent", grant|revoke)', async () => {
    const { metaPixelConsentAdapter } = await import('../../packages/script/src/runtime/registry/consent-adapters')
    const fbq = vi.fn()
    const proxy: any = { fbq }

    metaPixelConsentAdapter.applyDefault({ ad_storage: 'granted' }, proxy)
    expect(fbq).toHaveBeenCalledWith('consent', 'grant')

    metaPixelConsentAdapter.applyUpdate({ ad_storage: 'denied' }, proxy)
    expect(fbq).toHaveBeenCalledWith('consent', 'revoke')
  })

  it('gA adapter passes through full GCM state', async () => {
    const { googleAnalyticsConsentAdapter } = await import('../../packages/script/src/runtime/registry/consent-adapters')
    const gtag = vi.fn()
    const proxy: any = { gtag }
    const state = { ad_storage: 'granted' as const, analytics_storage: 'granted' as const }

    googleAnalyticsConsentAdapter.applyDefault(state, proxy)
    expect(gtag).toHaveBeenCalledWith('consent', 'default', state)

    googleAnalyticsConsentAdapter.applyUpdate(state, proxy)
    expect(gtag).toHaveBeenCalledWith('consent', 'update', state)
  })

  it('bing UET adapter maps ad_storage only', async () => {
    const { bingUetConsentAdapter } = await import('../../packages/script/src/runtime/registry/consent-adapters')
    const push = vi.fn()
    const proxy: any = { uetq: { push } }

    bingUetConsentAdapter.applyDefault({ ad_storage: 'granted', analytics_storage: 'denied' }, proxy)
    expect(push).toHaveBeenCalledWith('consent', 'default', { ad_storage: 'granted' })
  })

  it('clarity adapter maps analytics_storage to boolean', async () => {
    const { clarityConsentAdapter } = await import('../../packages/script/src/runtime/registry/consent-adapters')
    const clarity = vi.fn()
    const proxy: any = { clarity }

    clarityConsentAdapter.applyDefault({ analytics_storage: 'granted' }, proxy)
    expect(clarity).toHaveBeenCalledWith('consent', true)

    clarityConsentAdapter.applyUpdate({ analytics_storage: 'denied' }, proxy)
    expect(clarity).toHaveBeenCalledWith('consent', false)
  })
})
