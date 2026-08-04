import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRegistryScript } from '../../packages/script/src/runtime/utils'

const runtimeConfig = vi.hoisted(() => ({
  public: {
    scripts: {},
  },
}))

const useScriptMock = vi.hoisted(() => vi.fn((input, options) => ({ input, options })))
const unheadFeatures = vi.hoisted(() => ({ sourceLessScriptLoader: false }))

// Mock dependencies
vi.mock('nuxt/app', () => ({
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('../../packages/script/src/runtime/composables/useScript', () => ({
  useScript: useScriptMock,
}))

vi.mock('../../packages/script/src/runtime/unhead-features', () => ({
  isUnheadSourceLessScriptLoaderEnabled: () => unheadFeatures.sourceLessScriptLoader,
}))

afterEach(() => {
  unheadFeatures.sourceLessScriptLoader = false
  useScriptMock.mockClear()
})

describe('useRegistryScript scriptOptions', () => {
  it('should not mutate user-provided scriptOptions', () => {
    const mockOptionsFunction = vi.fn((_opts, _ctx) => ({
      scriptInput: { src: 'https://example.com/script.js' },
      scriptOptions: { use: () => ({ test: true }) },
    }))

    const userScriptOptions = { trigger: 'onNuxtReady' as const }
    const userOptions = { scriptOptions: userScriptOptions }
    useRegistryScript('test', mockOptionsFunction, userOptions)

    expect(userScriptOptions).not.toHaveProperty('use')
  })

  it('replaces registry use() with a server-safe noop outside client builds', () => {
    const unsafeUse = vi.fn(() => {
      throw new Error('use() should not run server-side')
    })
    const mockOptionsFunction = vi.fn((_opts, _ctx) => ({
      scriptInput: { src: 'https://example.com/script.js' },
      scriptOptions: { use: unsafeUse },
    }))

    const result = useRegistryScript('test', mockOptionsFunction, {})

    expect(result.options.use()).toBeUndefined()
    expect(unsafeUse).not.toHaveBeenCalled()
  })

  it('does not call npm-mode use() outside client builds', () => {
    const unsafeUse = vi.fn(() => {
      throw new Error('use() should not run server-side')
    })
    const mockOptionsFunction = vi.fn((_opts, _ctx) => ({
      scriptMode: 'npm' as const,
      scriptOptions: { use: unsafeUse },
    }))

    const result = useRegistryScript('test', mockOptionsFunction, {})

    expect(result.proxy).toEqual({})
    expect(unsafeUse).not.toHaveBeenCalled()
  })

  it('delegates npm mode to an Unhead source-less loader when supported', async () => {
    unheadFeatures.sourceLessScriptLoader = true
    const api = { track: vi.fn() }
    const clientInit = vi.fn(async () => api)
    const use = vi.fn(() => api)
    const result = useRegistryScript('posthog', () => ({
      scriptMode: 'npm' as const,
      scriptOptions: { use },
      clientInit,
    }), {
      scriptOptions: { trigger: 'manual' },
    }) as any

    expect(result.input).toMatchObject({
      key: 'posthog',
      loader: expect.any(Function),
    })
    expect(result.input).not.toHaveProperty('src')
    expect(result.options).toMatchObject({ trigger: 'manual' })
    expect(result.options).not.toHaveProperty('use')

    const signal = new AbortController().signal
    await expect(result.input.loader({ signal })).resolves.toBe(api)
    expect(clientInit).toHaveBeenCalledWith({ signal })
    expect(use).toHaveBeenCalledOnce()
  })
})

describe('useRegistryScript query param merging', () => {
  it('should merge query params when user provides custom src', () => {
    const mockOptionsFunction = vi.fn((_opts, _ctx) => ({
      scriptInput: {
        src: 'https://example.com/script.js?id=123&auth=abc&existing=default',
      },
    }))

    const userOptions = {
      scriptInput: {
        src: 'https://custom-domain.com/script.js?auth=override&new=param',
      },
    }

    const result = useRegistryScript('test', mockOptionsFunction, userOptions)

    // The options function should be called with the user options and context
    expect(mockOptionsFunction).toHaveBeenCalledWith(
      userOptions,
      { scriptInput: userOptions.scriptInput },
    )

    // Check the result contains merged query params (user params come first due to object spread)
    expect(result.input.src).toBe('https://custom-domain.com/script.js?auth=override&new=param&id=123&existing=default')
  })

  it('should preserve user query params over default ones', () => {
    const mockOptionsFunction = vi.fn((_opts, _ctx) => ({
      scriptInput: {
        src: 'https://example.com/script.js?param1=default&param2=default',
      },
    }))

    const userOptions = {
      scriptInput: {
        src: 'https://custom-domain.com/script.js?param1=override',
      },
    }

    const result = useRegistryScript('test', mockOptionsFunction, userOptions)

    expect(result.input.src).toBe('https://custom-domain.com/script.js?param1=override&param2=default')
  })

  it('should handle cases where user src has no query params', () => {
    const mockOptionsFunction = vi.fn((_opts, _ctx) => ({
      scriptInput: {
        src: 'https://example.com/script.js?id=123&auth=abc',
      },
    }))

    const userOptions = {
      scriptInput: {
        src: 'https://custom-domain.com/script.js',
      },
    }

    const result = useRegistryScript('test', mockOptionsFunction, userOptions)

    expect(result.input.src).toBe('https://custom-domain.com/script.js?id=123&auth=abc')
  })

  it('should handle cases where default src has no query params', () => {
    const mockOptionsFunction = vi.fn((_opts, _ctx) => ({
      scriptInput: {
        src: 'https://example.com/script.js',
      },
    }))

    const userOptions = {
      scriptInput: {
        src: 'https://custom-domain.com/script.js?custom=param',
      },
    }

    const result = useRegistryScript('test', mockOptionsFunction, userOptions)

    expect(result.input.src).toBe('https://custom-domain.com/script.js?custom=param')
  })

  it('should not modify src when no user src is provided', () => {
    const mockOptionsFunction = vi.fn((_opts, _ctx) => ({
      scriptInput: {
        src: 'https://example.com/script.js?id=123&auth=abc',
      },
    }))

    const userOptions = {}

    const result = useRegistryScript('test', mockOptionsFunction, userOptions)

    expect(result.input.src).toBe('https://example.com/script.js?id=123&auth=abc')
  })

  it('should handle complex URLs with paths and fragments', () => {
    const mockOptionsFunction = vi.fn((_opts, _ctx) => ({
      scriptInput: {
        src: 'https://example.com/path/to/script.js?id=123&version=1',
      },
    }))

    const userOptions = {
      scriptInput: {
        src: 'https://custom-domain.com/custom/path/script.js?version=2&custom=true',
      },
    }

    const result = useRegistryScript('test', mockOptionsFunction, userOptions)

    expect(result.input.src).toBe('https://custom-domain.com/custom/path/script.js?version=2&custom=true&id=123')
  })
})
