/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockBeforeEach = vi.fn()
const mockAfterEach = vi.fn()
const mockHook = vi.fn()

vi.mock('nuxt/app', () => ({
  useHead: vi.fn(),
  useRouter: () => ({ beforeEach: mockBeforeEach, afterEach: mockAfterEach }),
  useNuxtApp: () => ({ hook: mockHook, payload: { serverRendered: true } }),
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

describe('installAutoTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    Object.defineProperty(window, 'LUX', { value: undefined, writable: true, configurable: true })
  })

  it('registers router hooks and page:finish hook', async () => {
    const { installAutoTracker } = await import('../../packages/script/src/runtime/registry/speedcurve')
    installAutoTracker({ id: '123' })

    expect(mockBeforeEach).toHaveBeenCalledOnce()
    expect(mockAfterEach).toHaveBeenCalledOnce()
    expect(mockHook).toHaveBeenCalledWith('page:finish', expect.any(Function))
  })

  it('is idempotent — calling twice only registers hooks once', async () => {
    const { installAutoTracker } = await import('../../packages/script/src/runtime/registry/speedcurve')
    installAutoTracker({ id: '123' })
    installAutoTracker({ id: '456' })

    expect(mockBeforeEach).toHaveBeenCalledOnce()
  })

  it('calls startSoftNavigation on user navigations (SSR app: serverRendered=true)', async () => {
    const lux = { startSoftNavigation: vi.fn(), markLoadTime: vi.fn(), addData: vi.fn(), label: '' }
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    const { installAutoTracker } = await import('../../packages/script/src/runtime/registry/speedcurve')
    // serverRendered=true means pendingInitial=false: first beforeEach IS a user nav
    installAutoTracker({ id: '123' })

    const handler = mockBeforeEach.mock.calls[0][0] as (to: any) => void

    // First call — SSR app, all navigations call startSoftNavigation
    handler({ name: 'home', path: '/' })
    expect(lux.startSoftNavigation).toHaveBeenCalledOnce()

    handler({ name: 'about', path: '/about' })
    expect(lux.startSoftNavigation).toHaveBeenCalledTimes(2)
  })

  it('skips startSoftNavigation on initial nav for SPA-only app (serverRendered=false) but still sets label', async () => {
    const lux = { startSoftNavigation: vi.fn(), markLoadTime: vi.fn(), addData: vi.fn(), label: '' }
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    // Simulate SPA-only behavior by calling installAutoTracker with the same mocked hooks
    // but wiring the pendingInitial logic manually via the beforeEach handler.
    // Since module mocks are hoisted, we test the SPA path by resetting module cache
    // and re-importing with a serverRendered=false mock.
    vi.resetModules()
    vi.doMock('nuxt/app', () => ({
      useHead: vi.fn(),
      useRouter: () => ({ beforeEach: mockBeforeEach, afterEach: mockAfterEach }),
      useNuxtApp: () => ({ hook: mockHook, payload: { serverRendered: false } }),
      useRuntimeConfig: () => ({ public: { 'scripts': {}, 'nuxt-scripts': {} } }),
      createError: (e: any) => new Error(e.message),
      injectHead: vi.fn(),
      onNuxtReady: vi.fn(),
    }))
    vi.doMock('@speedcurve/lux/dist/lux-snippet.js?raw', () => ({
      default: '/* lux snippet */',
    }))
    vi.doMock('../../packages/script/src/runtime/composables/useScript', () => ({
      useScript: vi.fn(() => ({ proxy: {}, status: 'awaitingLoad' })),
    }))

    vi.clearAllMocks()

    const { installAutoTracker } = await import('../../packages/script/src/runtime/registry/speedcurve')
    installAutoTracker({ id: '123' })

    const handler = mockBeforeEach.mock.calls.at(-1)![0] as (to: any) => void

    // First call — SPA-only initial render: skip startSoftNavigation but still label the page
    handler({ name: 'home', path: '/' })
    expect(lux.startSoftNavigation).not.toHaveBeenCalled()
    expect(lux.label).toBe('home') // label IS set even when startSoftNavigation is skipped

    // Second call — user navigation, should call startSoftNavigation
    handler({ name: 'about', path: '/about' })
    expect(lux.startSoftNavigation).toHaveBeenCalledOnce()

    // Restore module state for subsequent tests
    vi.resetModules()
    vi.doMock('nuxt/app', () => ({
      useHead: vi.fn(),
      useRouter: () => ({ beforeEach: mockBeforeEach, afterEach: mockAfterEach }),
      useNuxtApp: () => ({ hook: mockHook, payload: { serverRendered: true } }),
      useRuntimeConfig: () => ({ public: { 'scripts': {}, 'nuxt-scripts': {} } }),
      createError: (e: any) => new Error(e.message),
      injectHead: vi.fn(),
      onNuxtReady: vi.fn(),
    }))
    vi.doMock('@speedcurve/lux/dist/lux-snippet.js?raw', () => ({
      default: '/* lux snippet */',
    }))
    vi.doMock('../../packages/script/src/runtime/composables/useScript', () => ({
      useScript: vi.fn(() => ({ proxy: {}, status: 'awaitingLoad' })),
    }))
  })

  it('applies default label from route name', async () => {
    const lux = { startSoftNavigation: vi.fn(), markLoadTime: vi.fn(), addData: vi.fn(), label: '' }
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    const { installAutoTracker } = await import('../../packages/script/src/runtime/registry/speedcurve')
    installAutoTracker({ id: '123' })

    const handler = mockBeforeEach.mock.calls[0][0] as (to: any) => void
    handler({ name: 'about', path: '/about' })

    expect(lux.label).toBe('about')
  })

  it('uses default route-name labeling when label is a static string (string is applied by applyConfig, not router hook)', async () => {
    const lux = { startSoftNavigation: vi.fn(), markLoadTime: vi.fn(), addData: vi.fn(), label: '' }
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    const { installAutoTracker } = await import('../../packages/script/src/runtime/registry/speedcurve')
    installAutoTracker({ id: '123', label: 'static-page' })

    const handler = mockBeforeEach.mock.calls[0][0] as (to: any) => void
    handler({ name: 'about', path: '/about' })

    // The router hook uses the default (route name), not the static string
    expect(lux.label).toBe('about')
  })

  it('uses label function when provided', async () => {
    const lux = { startSoftNavigation: vi.fn(), markLoadTime: vi.fn(), addData: vi.fn(), label: '' }
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    const { installAutoTracker } = await import('../../packages/script/src/runtime/registry/speedcurve')
    installAutoTracker({ id: '123', label: to => `custom:${to.path}` })

    const handler = mockBeforeEach.mock.calls[0][0] as (to: any) => void
    handler({ name: 'about', path: '/about' })

    expect(lux.label).toBe('custom:/about')
  })

  it('does not set label when label is false', async () => {
    const lux = { startSoftNavigation: vi.fn(), markLoadTime: vi.fn(), addData: vi.fn(), label: 'original' }
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    const { installAutoTracker } = await import('../../packages/script/src/runtime/registry/speedcurve')
    installAutoTracker({ id: '123', label: false })

    const handler = mockBeforeEach.mock.calls[0][0] as (to: any) => void
    handler({ name: 'about', path: '/about' })

    expect(lux.label).toBe('original')
  })

  it('does not set label when label function returns false', async () => {
    const lux = { startSoftNavigation: vi.fn(), markLoadTime: vi.fn(), addData: vi.fn(), label: 'keep-me' }
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    const { installAutoTracker } = await import('../../packages/script/src/runtime/registry/speedcurve')
    installAutoTracker({ id: '123', label: () => false })

    const handler = mockBeforeEach.mock.calls[0][0] as (to: any) => void
    handler({ name: 'about', path: '/about' })

    expect(lux.label).toBe('keep-me')
  })

  it('seals phantom beacon with luxNavFailed tag on failed navigation', async () => {
    const lux = { startSoftNavigation: vi.fn(), markLoadTime: vi.fn(), addData: vi.fn(), label: '' }
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    const { installAutoTracker } = await import('../../packages/script/src/runtime/registry/speedcurve')
    installAutoTracker({ id: '123' })

    const afterEachHandler = mockAfterEach.mock.calls[0][0] as (to: any, from: any, failure: any) => void

    // Successful nav — must NOT mark load time
    afterEachHandler({}, {}, undefined)
    expect(lux.markLoadTime).not.toHaveBeenCalled()

    // Failed nav — must seal beacon
    afterEachHandler({}, {}, new Error('guard cancelled'))
    expect(lux.markLoadTime).toHaveBeenCalledOnce()
    expect(lux.addData).toHaveBeenCalledWith('luxNavFailed', '1')
  })

  it('page:finish callback calls markLoadTime after double rAF', async () => {
    const lux = { startSoftNavigation: vi.fn(), markLoadTime: vi.fn(), addData: vi.fn(), label: '' }
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    // Make rAF synchronous so we can test without real paint cycles
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })

    const { installAutoTracker } = await import('../../packages/script/src/runtime/registry/speedcurve')
    installAutoTracker({ id: '123' })

    const pageFinishHandler = mockHook.mock.calls.find(([event]) => event === 'page:finish')?.[1] as () => void
    expect(pageFinishHandler).toBeDefined()

    expect(lux.markLoadTime).not.toHaveBeenCalled()
    pageFinishHandler()
    expect(lux.markLoadTime).toHaveBeenCalledOnce()

    vi.restoreAllMocks()
  })

  it('default label falls back to to.path when to.name is undefined', async () => {
    const lux = { startSoftNavigation: vi.fn(), markLoadTime: vi.fn(), addData: vi.fn(), label: '' }
    Object.defineProperty(window, 'LUX', { value: lux, writable: true, configurable: true })

    const { installAutoTracker } = await import('../../packages/script/src/runtime/registry/speedcurve')
    installAutoTracker({ id: '123' })

    const handler = mockBeforeEach.mock.calls[0][0] as (to: any) => void
    handler({ name: undefined, path: '/some/path' })

    expect(lux.label).toBe('/some/path')
  })

  it('beforeEach returns early without throwing when window.LUX is undefined at nav time', async () => {
    Object.defineProperty(window, 'LUX', { value: undefined, writable: true, configurable: true })

    const { installAutoTracker } = await import('../../packages/script/src/runtime/registry/speedcurve')
    installAutoTracker({ id: '123' })

    const handler = mockBeforeEach.mock.calls[0][0] as (to: any) => void
    expect(() => handler({ name: 'about', path: '/about' })).not.toThrow()
  })
})
