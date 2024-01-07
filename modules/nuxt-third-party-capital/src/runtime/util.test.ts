import { describe, expect, it, vi } from 'vitest'
import { GoogleAnalytics } from 'third-party-capital'
import { createHead, setHeadInjectionHandler } from '@unhead/vue'

import type { GoogleAnalyticsApi, GoogleAnalyticsOptions } from 'third-party-capital'
import type { ThirdPartyScriptOptions } from './types'
import { convertThirdPartyCapital, formatDimensionValue } from './util'

vi.mock('#imports', () => ({ useStyles: () => vi.importActual('../../../nuxt-script/src/runtime/composables/useStyles') }));

describe('convertThirdPartyCapital', () => {
  it('should format Third Party Captial output from Google Analytics', () => {
    const head = createHead()
    setHeadInjectionHandler(() => head)

    const options: ThirdPartyScriptOptions<GoogleAnalyticsOptions, GoogleAnalyticsApi> = { id: '1234' }

    const { $script } = convertThirdPartyCapital<GoogleAnalyticsOptions, GoogleAnalyticsApi>({
      data: GoogleAnalytics({ id: options.id }),
      mainScriptKey: 'gtag',
      options,
      use: () => ({ dataLayer: window.dataLayer, gtag: window.gtag }),
    })

    expect($script.id).toEqual('gtag')
    expect($script.loaded).toBeTruthy()
    expect($script.status.value).toEqual('awaitingLoad')
  })

  it('should throw an error if "mainScriptKey" does not exist', () => {
    const head = createHead()
    setHeadInjectionHandler(() => head)

    const options: ThirdPartyScriptOptions<GoogleAnalyticsOptions, GoogleAnalyticsApi> = { id: '1234' }

    expect(() => convertThirdPartyCapital<GoogleAnalyticsOptions, GoogleAnalyticsApi>({
      data: GoogleAnalytics({ id: options.id }),
      mainScriptKey: 'test',
      options,
      use: () => ({ dataLayer: window.dataLayer, gtag: window.gtag }),
    })).toThrowError('No external main script found!')
  })
})

describe('formatDimensionValue', () => {
  it('should add px to the end', () => {
    expect(formatDimensionValue('400')).toEqual('400px')
  })

  it('should not add px to the end', () => {
    expect(formatDimensionValue('400%')).toEqual('400%')
  })

  it('should return initial value if "px" is used', () => {
    expect(formatDimensionValue('400px')).toEqual('400px');
  })
})
