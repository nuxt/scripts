import type { GoogleAnalyticsApi } from 'third-party-capital'
import { object, string } from 'valibot'
import type { NuxtUseScriptOptions, ScriptDynamicSrcInput } from '#nuxt-scripts'
import { useScript, validateScriptInputSchema } from '#imports'

const GoogleAnalyticsOptions = object({
  id: string(),
})

export type GoogleAnalyticsInput = ScriptDynamicSrcInput<typeof GoogleAnalyticsOptions>

declare global {
  interface Window extends GoogleAnalyticsApi { }
}

/**
 * useScriptGoogleAnalytics
 *
 * A 3P wrapper for Google Analytics that takes an options input to feed into third-party-capital({@link https://github.com/GoogleChromeLabs/third-party-capital}), which returns instructions for nuxt-scripts.
 */
export function useScriptGoogleAnalytics<T extends GoogleAnalyticsApi>(options?: GoogleAnalyticsInput, _scriptOptions?: Omit<NuxtUseScriptOptions<T>, 'beforeInit' | 'use'>) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {}
  scriptOptions.beforeInit = () => {
    import.meta.dev && validateScriptInputSchema(GoogleAnalyticsOptions, options)
    if (import.meta.client) {
      window.dataLayer = window.dataLayer || []
      window.gtag = function gtag(...p) {
        window.dataLayer.push(p)
      }
      window.gtag('js', new Date())
      window.gtag('config', options.id)
    }
  }
  // Note: inputs.useScriptInput is not usable, needs to be normalized
  return useScript<GoogleAnalyticsApi>({
    key: 'googleAnalytics',
    src: 'https://www.googletagmanager.com/gtag/js',
  }, {
    ...scriptOptions,
    use: () => ({ dataLayer: window.dataLayer, gtag: window.gtag }),
  })
}
