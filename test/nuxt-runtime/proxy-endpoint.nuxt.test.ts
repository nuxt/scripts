import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useRuntimeConfig } from 'nuxt/app'
import { describe, expect, it } from 'vitest'
import { scriptProxyEndpoint } from '../../packages/script/src/runtime/utils'

async function withConfig(config: Record<string, any>, run: () => void) {
  await mountSuspended({
    setup() {
      const runtime = useRuntimeConfig()
      const original = runtime.public['nuxt-scripts']
      runtime.public['nuxt-scripts'] = config as any
      try {
        run()
      }
      finally {
        runtime.public['nuxt-scripts'] = original
      }
      return () => null
    },
  })
}

describe('script proxy endpoint selection', () => {
  it('returns the registered collection endpoint', async () => {
    await withConfig({ proxyEndpoints: { googleAnalytics: '/custom/p/ga' } }, () => {
      expect(scriptProxyEndpoint('googleAnalytics')).toBe('/custom/p/ga')
    })
  })

  it('respects a global proxy opt-out and per-call override', async () => {
    await withConfig({
      defaultScriptOptions: { proxy: false },
      proxyEndpoints: { googleAnalytics: '/custom/p/ga' },
    }, () => {
      expect(scriptProxyEndpoint('googleAnalytics')).toBeUndefined()
      expect(scriptProxyEndpoint('googleAnalytics', { proxy: true })).toBe('/custom/p/ga')
    })
  })

  it('respects per-call opt-out and absent endpoints', async () => {
    await withConfig({ proxyEndpoints: { googleAnalytics: '/custom/p/ga' } }, () => {
      expect(scriptProxyEndpoint('googleAnalytics', { proxy: false })).toBeUndefined()
      expect(scriptProxyEndpoint('tiktokPixel')).toBeUndefined()
    })
    await withConfig({}, () => {
      expect(scriptProxyEndpoint('googleAnalytics')).toBeUndefined()
    })
  })
})
