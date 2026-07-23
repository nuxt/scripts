import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { bindScriptApiMethods, bindScriptApiResolver } from '../../packages/script/src/runtime/script-api'

function createForwardingProxy<T extends object>(target: T): T {
  const handler: ProxyHandler<object> = {
    get(innerTarget, property, receiver) {
      const value = Reflect.get(innerTarget, property, receiver)
      return typeof value === 'object' && value !== null
        ? new Proxy(value, handler)
        : value
    },
  }
  return new Proxy(target, handler) as T
}

describe('bindScriptApiMethods', () => {
  it('preserves the vendor instance as a method receiver through a forwarding proxy', () => {
    const brandedCanvas = new WeakSet<object>()
    const canvas = {
      getBoundingClientRect() {
        if (!brandedCanvas.has(this))
          throw new TypeError('Illegal invocation')
        return { width: 120 }
      },
    }
    brandedCanvas.add(canvas)
    const api = {
      canvas,
      addConfetti() {
        return this.canvas.getBoundingClientRect().width
      },
    }
    const proxy = createForwardingProxy(bindScriptApiMethods(api))

    expect(proxy.addConfetti()).toBe(120)
  })

  it('keeps bound method identity stable', () => {
    const api = {
      call() {
        return this
      },
    }
    const bound = bindScriptApiMethods(api)

    expect(bound.call).toBe(bound.call)
    expect(bound.call()).toBe(api)
  })

  it('binds APIs resolved by promises from another realm', async () => {
    const brandedApis = new WeakSet<object>()
    const api = {
      call() {
        if (!brandedApis.has(this))
          throw new TypeError('Illegal invocation')
        return 120
      },
    }
    brandedApis.add(api)
    const promise = runInNewContext('Promise.resolve(api)', { api }) as Promise<typeof api>
    const resolved = await bindScriptApiResolver(() => promise)()
    const proxy = createForwardingProxy(resolved)

    expect(proxy.call()).toBe(120)
  })
})
