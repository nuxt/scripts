/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('nuxt/app', () => ({
  useHead: vi.fn(),
  useRouter: () => ({ beforeEach: vi.fn(), afterEach: vi.fn() }),
  useNuxtApp: () => ({ hook: vi.fn(), payload: { serverRendered: true } }),
  useRuntimeConfig: () => ({ public: { 'scripts': {}, 'nuxt-scripts': {} } }),
  createError: (e: any) => new Error(e.message),
  injectHead: vi.fn(),
  onNuxtReady: vi.fn(),
}))

vi.mock('../../packages/script/src/runtime/composables/useScript', () => ({
  useScript: vi.fn(() => ({ proxy: {}, status: 'awaitingLoad' })),
}))

vi.mock('@speedcurve/lux/dist/lux-snippet.js?raw', () => ({
  default: '/* lux snippet */',
}))

describe('applyConfig', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'LUX', { value: {}, writable: true, configurable: true })
  })

  it('sets known LUX config fields from options', async () => {
    const lux: Record<string, unknown> = {}
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    const { applyConfig } = await import('../../packages/script/src/runtime/registry/speedcurve')
    applyConfig({ id: '123', samplerate: 50, maxMeasureTime: 30000 })

    expect(lux.samplerate).toBe(50)
    expect(lux.maxMeasureTime).toBe(30000)
  })

  it('does not set undefined options on window.LUX', async () => {
    const lux: Record<string, unknown> = {}
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    const { applyConfig } = await import('../../packages/script/src/runtime/registry/speedcurve')
    applyConfig({ id: '123' })

    expect(lux.samplerate).toBeUndefined()
    expect(lux.cookieDomain).toBeUndefined()
    expect(lux.label).toBeUndefined()
  })

  it('does not throw when window.LUX is undefined', async () => {
    Object.defineProperty(window, 'LUX', { value: undefined, writable: true, configurable: true })

    const { applyConfig } = await import('../../packages/script/src/runtime/registry/speedcurve')
    expect(() => applyConfig({ id: '123', samplerate: 50 })).not.toThrow()
  })

  it('does not forward autoTrackSpaNavigations to window.LUX', async () => {
    const lux: Record<string, unknown> = {}
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    const { applyConfig } = await import('../../packages/script/src/runtime/registry/speedcurve')
    applyConfig({ id: '123', autoTrackSpaNavigations: true })

    expect(lux.autoTrackSpaNavigations).toBeUndefined()
  })

  it('does not forward id to window.LUX (id belongs in the CDN URL only)', async () => {
    const lux: Record<string, unknown> = {}
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    const { applyConfig } = await import('../../packages/script/src/runtime/registry/speedcurve')
    applyConfig({ id: 'MY_CUSTOMER_ID' })

    expect(lux.id).toBeUndefined()
  })

  it('sets label when a static string is provided', async () => {
    const lux: Record<string, unknown> = {}
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    const { applyConfig } = await import('../../packages/script/src/runtime/registry/speedcurve')
    applyConfig({ id: '123', label: 'my-page' })

    expect(lux.label).toBe('my-page')
  })

  it('does not forward label to window.LUX when label is a function', async () => {
    const lux: Record<string, unknown> = {}
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    const { applyConfig } = await import('../../packages/script/src/runtime/registry/speedcurve')
    applyConfig({ id: '123', label: to => to.path })

    expect(lux.label).toBeUndefined()
  })

  it('does not forward label to window.LUX when label is false', async () => {
    const lux: Record<string, unknown> = {}
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    const { applyConfig } = await import('../../packages/script/src/runtime/registry/speedcurve')
    applyConfig({ id: '123', label: false })

    expect(lux.label).toBeUndefined()
  })
})
