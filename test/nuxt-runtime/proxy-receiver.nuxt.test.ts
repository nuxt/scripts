import { describe, expect, it } from 'vitest'
import { useScript } from '../../packages/script/src/runtime/composables/useScript'

describe('script API proxy receivers', () => {
  it('preserves vendor private state when a proxy method is called', () => {
    const brandedApis = new WeakSet<object>()
    const api = {
      readCanvasWidth() {
        if (!brandedApis.has(this))
          throw new TypeError('Illegal invocation')
        return 120
      },
    }
    brandedApis.add(api)
    const script = useScript({
      key: 'strict-vendor-api',
      innerHTML: '',
    }, {
      trigger: 'manual',
      use: () => api,
    })

    expect(script.proxy.readCanvasWidth()).toBe(120)
    script.remove()
  })
})
