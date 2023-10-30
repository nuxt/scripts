import { expect, test } from 'vitest'
import { GoogleAnalytics } from 'third-party-capital'
import { createHead, setHeadInjectionHandler } from '@unhead/vue'

import type { GoogleAnalyticsApi, GoogleAnalyticsOptions } from 'third-party-capital'
import type { ThirdPartyScriptOptions } from '../types'
import { convertThirdPartyCapital } from './util'

test('formats Third Party Captial output from Google Analytics', () => {
  const head = createHead()
  setHeadInjectionHandler(() => head)

  const options: ThirdPartyScriptOptions<GoogleAnalyticsOptions, GoogleAnalyticsApi> = { id: '1234' }

  const { $script } = convertThirdPartyCapital<GoogleAnalyticsApi>({
    data: GoogleAnalytics({ id: options.id }),
    mainScriptKey: 'gtag',
    options,
    use: () => ({ dataLayer: window.dataLayer, gtag: window.gtag }),
  })
  expect($script.id).toEqual('gtag')
})
