import { withQuery } from 'ufo'
import { defineThirdPartyScript } from '../util'
import type { ThirdPartyScriptOptions } from '../types'
import { useServerHead } from '#imports'

export interface GoogleTagManagerOptions {
  id: string
}

export interface GoogleTagManagerApi {
  dataLayer: Record<string, any>[]
}

declare global {
  interface Window {
    dataLayer: Record<string, any>[]
    google_tag_manager: Record<string, any>
  }
}

export const GoogleTagManager = defineThirdPartyScript<GoogleTagManagerOptions, GoogleTagManagerApi>({
  mock: {
    dataLayer: [],
  },
  setup(options) {
    useServerHead({
      script: [
        {
          innerHTML: 'window.dataLayer=window.dataLayer||[];window.dataLayer.push({\'gtm.start\':new Date().getTime(),event:\'gtm.js\'});',
        },
      ],
      noscript: [
        {
          innerHTML: `<iframe src="https://www.googletagmanager.com/ns.html?id=${options.id}"
height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
        },
      ],
    })
    return {
      key: 'google-tag-manager',
      use: () => ({ dataLayer: window.dataLayer, google_tag_manager: window.google_tag_manager }),
      script: {
        src: withQuery('https://www.googletagmanager.com/gtm.js', { id: options.id }),
      },
    }
  },
})

export function useGoogleTagManager(options?: GoogleTagManagerOptions, scriptOptions?: ThirdPartyScriptOptions) {
  // TODO reactivity
  return GoogleTagManager(options, scriptOptions)
}
