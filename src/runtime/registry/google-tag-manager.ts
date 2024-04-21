import type { GoogleTagManagerApi } from 'third-party-capital'
import { object, string } from 'valibot'
import { registryScriptOptions } from '../utils'
import { useScript } from '#imports'
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
  return useScript<T>({
    // need static sources so they can be transformed
    key: 'googleTagManager',
    src: 'https://www.googletagmanager.com/gtm.js',
  }, {
    ...registryScriptOptions({
      scriptOptions,
      schema: GoogleTagManagerOptions,
      options,
      clientInit: import.meta.server
        ? undefined
        : () => {
            window.dataLayer = window.dataLayer || []
            window.dataLayer.push({ 'gtm.start': new Date().getTime(), 'event': 'gtm.js' })
          },
    }),
    // allow dataLayer to be accessed on the server
    stub: import.meta.client
      ? undefined
      : ({ fn }) => {
          return fn === 'dataLayer' ? [] : undefined
        },
    use: () => ({ dataLayer: window.dataLayer, google_tag_manager: window.google_tag_manager }),
  })
}
