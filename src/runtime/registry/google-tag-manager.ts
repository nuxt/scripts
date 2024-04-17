import type { GoogleTagManagerApi } from 'third-party-capital'
import { object, string } from 'valibot'

import { useScript, validateScriptInputSchema } from '#imports'
import type { NuxtUseScriptOptions, ScriptDynamicSrcInput } from '#nuxt-scripts'

const GoogleTagManagerOptions = object({
  id: string(),
})

export type GoogleTagManagerInput = ScriptDynamicSrcInput<typeof GoogleTagManagerOptions>

declare global {
  interface Window extends GoogleTagManagerApi { }
}

/**
 * useScriptGoogleTagManager
 *
 * A 3P wrapper for Google Tag Manager that takes an options input to feed into third-party-capital({@link https://github.com/GoogleChromeLabs/third-party-capital}), which returns instructions for nuxt-scripts.
 */
export function useScriptGoogleTagManager<T extends GoogleTagManagerApi>(options?: GoogleTagManagerInput, _scriptOptions?: Omit<NuxtUseScriptOptions<T>, 'beforeInit' | 'use'>) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {}
  scriptOptions.beforeInit = () => {
    import.meta.dev && validateScriptInputSchema(GoogleTagManagerOptions, options)
    if (import.meta.client) {
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push({ 'gtm.start': new Date().getTime(), 'event': 'gtm.js' })
    }
  }
  // Note: inputs.useScriptInput is not usable, needs to be normalized
  return useScript<GoogleTagManagerApi>({
    // need static sources so they can be transformed
    key: 'googleTagManager',
    src: 'https://www.googletagmanager.com/gtm.js',
  }, {
    ...scriptOptions,
    use: () => ({ dataLayer: window.dataLayer, google_tag_manager: window.google_tag_manager }),
  })
}
