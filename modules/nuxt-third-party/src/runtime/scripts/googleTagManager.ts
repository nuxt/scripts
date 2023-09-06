import { useScript, useServerHead} from '#imports'
import { defineThirdPartyScript } from '../util'
import { withQuery } from 'ufo'

export interface GoogleTagManagerOptions {
  id: string
}

export interface GoogleTagManager {
  dataLayer: Record<string, any>[]
}

declare global {
  interface Window {
    dataLayer: Record<string, any>[]
    google_tag_manager: Record<string, any>
  }
}

export const GoogleTagManager = defineThirdPartyScript<GoogleTagManagerOptions, GoogleTagManager>({
  mock: {
    dataLayer: []
  },
  setup(options) {
    useServerHead({
      script: [
        {
          innerHTML: 'window.dataLayer=window.dataLayer||[];window.dataLayer.push({\'gtm.start\':new Date().getTime(),event:\'gtm.js\'});'
        }
      ],
      noscript: [
        {
          innerHTML: `<iframe src="https://www.googletagmanager.com/ns.html?id=${options.id}"
height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
        },
      ],
    })
    return useScript<GoogleTagManager>({
      key: 'google-tag-manager',
      use: () => ({ dataLayer: window.dataLayer, google_tag_manager: window.google_tag_manager }),
      script: {
        src: withQuery('https://www.googletagmanager.com/gtm.js', { id: options.id }),
      },
    })
  },
})

export function useGoogleTagManager(options?: GoogleTagManagerOptions) {
  // TODO reactivity
  return GoogleTagManager(options)
}
