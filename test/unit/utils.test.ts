import { describe, expect, it, vi } from 'vitest'
import { useRegistryScript } from '../../src/runtime/utils'

// Mock dependencies
vi.mock('nuxt/app', () => ({
  useRuntimeConfig: () => ({ public: { scripts: {} } }),
}))

vi.mock('../../src/runtime/composables/useScript', () => ({
  useScript: vi.fn((input, options) => ({ input, options })),
}))

vi.mock('#nuxt-scripts-validator', () => ({
  parse: vi.fn(),
}))

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
