import { describe, expect, it, vi } from 'vitest'
import { useNuxt } from '@nuxt/kit'
import { getTpcScriptContent } from '../../src/tpc/utils'

vi.mock('@nuxt/kit', async (og) => {
  const mod = await og<typeof import('@nuxt/kit')>()
  return {
    ...mod,
    useNuxt: vi.fn(mod.useNuxt),
  }
})

describe.each([
  {
    env: 'production',
    isDev: false,
  },
  {
    env: 'development',
    isDev: true,
  },
])('tpc composable generation in $env', ({ isDev, env }) => {
  // @ts-expect-error mock only needed properties
  vi.mocked(useNuxt).mockReturnValue({ options: { dev: isDev } })

  it ('expect to throw if no main scripts', () => {
    expect(() => getTpcScriptContent({
      data: {
        scripts: [],
        id: 'google-analytics',
        description: 'for test purpose',
      },
      tpcKey: 'google-analytics',
      tpcTypeImport: 'GoogleAnalyticsInput',
      augmentWindowTypes: true,
      scriptFunctionName: 'useScriptGoogleAnalytics',
      use: () => {},
      stub: () => {},
    })).toThrowError('no main script found for google-analytics in third-party-capital')
  })

  it('expect to generate script content', () => {
    const result = getTpcScriptContent({
      data: {
        id: 'google-analytics',
        scripts: [
          {
            key: 'google-analytics',
            params: ['id'],
            url: 'https://www.google-analytics.com/analytics.js',
            strategy: 'client',
            location: 'head',
            action: 'prepend',
          },
        ],
        description: 'for test purpose',
      },
      tpcKey: 'google-analytics',
      tpcTypeImport: 'GoogleAnalyticsInput',
      augmentWindowTypes: true,
      scriptFunctionName: 'useScriptGoogleAnalytics',
      use: () => {},
      stub: () => {},
    })

    expect(result).toMatchSnapshot(`composable generation in ${env}`)
  })
})
