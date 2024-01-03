import { GoogleTagManager } from 'third-party-capital'
import type { GoogleTagManagerApi, GoogleTagManagerOptions } from 'third-party-capital'
import { convertThirdPartyCapital, validateRequiredOptions } from '../util'
import type { ThirdPartyScriptApi, ThirdPartyScriptOptions } from '../types'
declare global {
  interface Window extends GoogleTagManagerApi { }
}

export function useGoogleTagManager(options: ThirdPartyScriptOptions<GoogleTagManagerOptions, GoogleTagManagerApi> = {}): ThirdPartyScriptApi<GoogleTagManagerApi>  {
  const gtm = GoogleTagManager({ id: options.id })
  validateRequiredOptions(gtm.id, options, ['id'])

  return convertThirdPartyCapital<GoogleTagManagerOptions, GoogleTagManagerApi>({
    data: gtm,
    mainScriptKey: 'gtm',
    options,
    use: () => ({ dataLayer: window.dataLayer, google_tag_manager: window.google_tag_manager }),
  })
}
