import { withQuery } from 'ufo'
import type { GoogleTagManagerApi, GoogleTagManagerOptions } from 'third-party-capital'
import { useScript } from '../composables/useScript'
import type { ThirdPartyScriptOptions } from '../types'
import { validateRequiredOptions } from '../util'
import { useServerHead } from '#imports'

declare global {
  interface Window extends GoogleTagManagerApi {}
}

export function useGoogleTagManager(options: ThirdPartyScriptOptions<GoogleTagManagerOptions, GoogleTagManagerApi> = {}) {
  const key = 'google-tag-manager'
  validateRequiredOptions(key, options, ['id'])
  useServerHead({
    script: [
      {
        key: `${key}:init`,
        innerHTML: 'window.dataLayer=window.dataLayer||[];window.dataLayer.push({\'gtm.start\':new Date().getTime(),event:\'gtm.js\'});',
      },
    ],
    noscript: [
      options.id
        ? {
            key: `${key}:fallback`,
            innerHTML: `<iframe src="https://www.googletagmanager.com/ns.html?id=${options.id}"
height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
          }
        : {},
    ],
  })
  // TODO reactivity
  return useScript<GoogleTagManagerApi>({
    key,
    src: () => withQuery('https://www.googletagmanager.com/gtm.js', { id: options.id }),
  }, {
    ...options,
    use: () => ({ dataLayer: window.dataLayer, google_tag_manager: window.google_tag_manager }),
  })
}
