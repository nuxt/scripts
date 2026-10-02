import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useScriptGoogleAnalytics } from '../../packages/script/src/runtime/registry/google-analytics'

const mocks = vi.hoisted(() => ({ endpoint: undefined as string | undefined, definition: undefined as any }))
vi.mock('#nuxt-scripts/utils', () => ({
  scriptProxyEndpoint: (_key: string, options: any) => options?.proxy === false ? undefined : mocks.endpoint,
  useRegistryScript: (_key: string, factory: (options: any) => any, options: any) => {
    mocks.definition = factory(options)
    return {}
  },
}))

function configCommand() {
  return Array.from((window as any).dataLayer.find((row: any) => row[0] === 'config'))
}

describe('remote Google Analytics collection proxy', () => {
  beforeEach(() => {
    mocks.endpoint = undefined
    delete (window as any).dataLayer
  })

  it.each(['/_scripts/p/www.google-analytics.com', '/custom/p/ga'])('configures first-party collection at %s', (endpoint) => {
    mocks.endpoint = endpoint
    useScriptGoogleAnalytics({ id: 'G-TEST' })
    mocks.definition.clientInit()
    expect(configCommand()).toEqual(['config', 'G-TEST', {
      transport_url: new URL(endpoint, window.location.origin).href,
    }])
    expect(mocks.definition.scriptInput.src).toBe('https://www.googletagmanager.com/gtag/js?id=G-TEST')
  })

  it('respects a composable proxy opt-out', () => {
    mocks.endpoint = '/_scripts/p/www.google-analytics.com'
    useScriptGoogleAnalytics({ id: 'G-TEST', scriptOptions: { proxy: false } })
    mocks.definition.clientInit()
    expect(configCommand()).toEqual(['config', 'G-TEST'])
  })

  it('retains direct collection when no proxy endpoint is registered', () => {
    useScriptGoogleAnalytics({ id: 'G-TEST' })
    mocks.definition.clientInit()
    expect(configCommand()).toEqual(['config', 'G-TEST'])
  })
})
