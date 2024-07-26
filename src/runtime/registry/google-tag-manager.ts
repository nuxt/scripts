// WARNING: This file is automatically generated, do not manually modify.
import { withQuery } from 'ufo'
import type { GoogleTagManagerApi, DataLayer } from 'third-party-capital'
import { useRegistryScript } from '#nuxt-scripts-utils'
import type { RegistryScriptInput } from '#nuxt-scripts'
import { object, string, optional } from '#nuxt-scripts-validator'

declare global {
  interface Window extends GoogleTagManagerApi {}
}
export const GoogleTagManagerOptions = object({
  id: string(),
  l: optional(string()),
})
export type GoogleTagManagerInput = RegistryScriptInput<typeof GoogleTagManagerOptions>

function use(options: GoogleTagManagerInput) {
  return { dataLayer: (window as any)[options.l!] as DataLayer, google_tag_manager: window.google_tag_manager }
}

export function useScriptGoogleTagManager(_options?: GoogleTagManagerInput) {
  return useRegistryScript<ReturnType<typeof use>, typeof GoogleTagManagerOptions>(_options?.key || 'googleTagManager', options => ({
    scriptInput: {
      src: withQuery('https://www.googletagmanager.com/gtm.js', { id: options?.id, l: options?.l }),
    },
    schema: import.meta.dev ? GoogleTagManagerOptions : undefined,
    scriptOptions: {
      use: () => use(options),
      stub: import.meta.client ? undefined : ({ fn }) => { return fn === 'dataLayer' ? [] : void 0 },
      performanceMarkFeature: 'nuxt-third-parties-gtm',
      ...({ tagPriority: 1 }),
    },
    // eslint-disable-next-line
        // @ts-ignore
    // eslint-disable-next-line
        clientInit: import.meta.server ? undefined : () => {window[options?.$1 ??  "dataLayer"]=window[options?.$1 ??  "dataLayer"]||[];window[options?.$1 ??  "dataLayer"].push({'gtm.start':new Date().getTime(),event:'gtm.js'});},
  }), _options)
}
