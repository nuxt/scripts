import { expect, it, vi } from 'vitest'
import { createHead, setHeadInjectionHandler } from '@unhead/vue'

import type { ThirdPartyScriptOptions } from '../types'
import type { GoogleMapsLoaderApi, GoogleMapsLoaderOptions } from './googleMaps'
import { useGoogleMaps } from './googleMaps'

vi.mock('#imports', () => ({ useScript: () => vi.importActual('../../../../nuxt-script/src/runtime/composables/useScript') }))

it('should return a valid script from useGoogleMaps', () => {
  const head = createHead()
  setHeadInjectionHandler(() => head)

  const options: ThirdPartyScriptOptions<GoogleMapsLoaderOptions, GoogleMapsLoaderApi> = { apiKey: '1234' }

  const { $script } = useGoogleMaps({
    apiKey: options.apiKey,
    trigger: 'idle',
    skipEarlyConnections: true,
  })

  expect($script.id).toEqual('google-maps-loader')
  expect($script.loaded).toBeTruthy()
  expect($script.status.value).toEqual('awaitingLoad')
})
