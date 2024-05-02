import type { GoogleTagManagerApi } from 'third-party-capital'
import { withQuery } from 'ufo'
import { registryScript } from '../utils'
import { object, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

const GoogleTagManagerOptions = object({
  id: string(),
})

export type GoogleTagManagerInput = RegistryScriptInput<typeof GoogleTagManagerOptions>

declare global {
  interface Window extends GoogleTagManagerApi { }
}

/**
 * useScriptGoogleTagManager
 *
 * A 3P wrapper for Google Tag Manager that takes an options input to feed into third-party-capital({@link https://github.com/GoogleChromeLabs/third-party-capital}), which returns instructions for nuxt-scripts.
 */
export function useScriptGoogleTagManager<T extends GoogleTagManagerApi>(options?: GoogleTagManagerInput) {
  return registryScript<T, typeof GoogleTagManagerOptions>('googleTagManager', options => ({
    scriptInput: {
      async: true,
      src: withQuery('https://www.googletagmanager.com/gtm.js', {
        id: options?.id,
      }),
    },
    schema: import.meta.dev ? GoogleTagManagerOptions : undefined,
    scriptOptions: {
      use() {
        return { dataLayer: window.dataLayer, google_tag_manager: window.google_tag_manager }
      },
      // allow dataLayer to be accessed on the server
      stub: import.meta.client
        ? undefined
        : ({ fn }) => {
            return fn === 'dataLayer' ? [] : undefined
          },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          window.dataLayer = window.dataLayer || []
          window.dataLayer.push({ 'gtm.start': new Date().getTime(), 'event': 'gtm.js' })
        },
  }), options)
}
