/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useScriptMetricRavenAnalytics } from '../../packages/script/src/runtime/registry/metricraven-analytics'

const mocks = vi.hoisted(() => ({
  definition: undefined as any,
  useRegistryScript: vi.fn(),
}))

vi.mock('@unhead/vue', () => ({ useHead: vi.fn() }))

vi.mock('../../packages/script/src/runtime/utils', () => ({
  useRegistryScript: mocks.useRegistryScript,
}))

const SITE_ID = 'ana_pub_AbC123-xyz_9'

function setup(options: Record<string, unknown> = { siteId: SITE_ID }) {
  mocks.useRegistryScript.mockImplementation((_key: string, factory: (o: any, ctx: any) => any) => {
    mocks.definition = factory(options, { scriptInput: options.scriptInput })
    return { status: ref('awaitingLoad'), signal: new AbortController().signal, load: vi.fn() }
  })
  useScriptMetricRavenAnalytics(options as any)
  return {
    scriptInput: mocks.definition.scriptInput as Record<string, unknown>,
    use: mocks.definition.scriptOptions.use as () => Record<string, (...args: any[]) => any>,
    clientInit: mocks.definition.clientInit as (() => void) | undefined,
  }
}

function dataAttributes(scriptInput: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(scriptInput).filter(([key, value]) => key.startsWith('data-') && value !== undefined))
}

describe('metricraven analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as any).metricraven
    delete (window as any).metricravenConsent
  })

  it('loads the hosted tracker with the site id', () => {
    const { scriptInput } = setup()
    expect(scriptInput.src).toBe('https://metricraven.com/js/script.js')
    expect(scriptInput['data-site-id']).toBe(SITE_ID)
  })

  it('pins the event endpoint and add-on base so bundling does not change them', () => {
    // The tracker derives both from its own src. A bundled copy is served from
    // the Nuxt origin, so the attributes have to carry them instead.
    const { scriptInput } = setup()
    expect(scriptInput['data-api']).toBe('https://metricraven.com/api/v1/collect')
    expect(scriptInput['data-addons']).toBe('https://metricraven.com/js/addons/')
  })

  it('follows apiHost for the script, the endpoint and the add-ons', () => {
    const { scriptInput } = setup({ siteId: SITE_ID, apiHost: 'https://a.example.com/' })
    expect(scriptInput.src).toBe('https://a.example.com/js/script.js')
    expect(scriptInput['data-api']).toBe('https://a.example.com/api/v1/collect')
    expect(scriptInput['data-addons']).toBe('https://a.example.com/js/addons/')
  })

  it('leaves a relative scriptUrl to the tracker and sends events to endpoint', () => {
    const { scriptInput } = setup({ siteId: SITE_ID, scriptUrl: '/a/script', endpoint: '/a/event' })
    expect(scriptInput.src).toBe('/a/script')
    expect(scriptInput['data-api']).toBe('/a/event')
    expect(scriptInput['data-addons']).toBeUndefined()
  })

  it('uses metricraven.com add-ons for an absolute scriptUrl not served as /js/script.js', () => {
    const { scriptInput } = setup({ siteId: SITE_ID, scriptUrl: 'https://example.com/stats/mr.js' })
    expect(scriptInput['data-api']).toBe('https://example.com/api/v1/collect')
    expect(scriptInput['data-addons']).toBe('https://metricraven.com/js/addons/')
  })

  it('derives the defaults from an absolute scriptInput.src override', () => {
    const { scriptInput } = setup({ siteId: SITE_ID, scriptInput: { src: 'https://a.example.com/js/script.js' } })
    expect(scriptInput['data-api']).toBe('https://a.example.com/api/v1/collect')
    expect(scriptInput['data-addons']).toBe('https://a.example.com/js/addons/')
  })

  it('renders only the defaults without options', () => {
    const { scriptInput } = setup()
    expect(Object.keys(dataAttributes(scriptInput)).sort()).toEqual(['data-addons', 'data-api', 'data-site-id'])
  })

  it('maps every option to the tracker attribute', () => {
    const { scriptInput } = setup({
      siteId: SITE_ID,
      addonsUrl: '/a/addons/',
      autoPageviews: false,
      hashRouting: 'all',
      stripQuery: true,
      adConsent: true,
      domain: 'example.com',
      allowLocalhost: true,
      allowedHostnames: ['app.example.io', ' shop.example.net ', ''],
      identityToken: 'h.p.s',
      autocapture: ['clicks', 'downloads'],
      debug: true,
    })
    expect(dataAttributes(scriptInput)).toEqual({
      'data-site-id': SITE_ID,
      'data-api': 'https://metricraven.com/api/v1/collect',
      'data-addons': '/a/addons/',
      'data-auto-pageviews': 'false',
      'data-track-hash': 'all',
      'data-strip-query': 'true',
      'data-ad-consent': 'granted',
      'data-domain': 'example.com',
      'data-allow-localhost': 'true',
      'data-allowed-hostnames': 'app.example.io,shop.example.net',
      'data-identity-token': 'h.p.s',
      'data-autocapture': 'clicks,downloads',
      'data-debug': 'true',
    })
  })

  it('renders hashRouting true and autocapture false', () => {
    const { scriptInput } = setup({ siteId: SITE_ID, hashRouting: true, autocapture: false })
    expect(scriptInput['data-track-hash']).toBe('true')
    expect(scriptInput['data-autocapture']).toBe('false')
  })

  it('grants storage consent before the tracker starts when consent is set', () => {
    expect(setup().clientInit).toBeUndefined()
    const { clientInit } = setup({ siteId: SITE_ID, consent: true })
    clientInit!()
    expect((window as any).metricravenConsent).toBe(true)
  })

  it('exposes the tracker global once loaded', () => {
    const track = vi.fn()
    const identify = vi.fn()
    ;(window as any).metricraven = { track, identify, getVisitorId: () => 'v1' }
    const api = setup().use()
    api.track!('signup', { plan: 'pro' })
    api.identify!('42', { email: 'a@example.com' })
    expect(track).toHaveBeenCalledWith('signup', { plan: 'pro' })
    expect(identify).toHaveBeenCalledWith('42', { email: 'a@example.com' })
    expect(api.getVisitorId!()).toBe('v1')
  })
})
