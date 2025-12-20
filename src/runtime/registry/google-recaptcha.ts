import { withQuery } from 'ufo'
import { useRegistryScript } from '#nuxt-scripts/utils'
import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { object, string, optional, boolean } from '#nuxt-scripts-validator'

export const GoogleRecaptchaOptions = object({
  siteKey: string(),
  // Use enterprise.js instead of api.js
  enterprise: optional(boolean()),
  // Use recaptcha.net (works in China)
  recaptchaNet: optional(boolean()),
  // Language code
  hl: optional(string()),
})

export type GoogleRecaptchaInput = RegistryScriptInput<typeof GoogleRecaptchaOptions>

export interface GoogleRecaptchaApi {
  grecaptcha: {
    ready: (callback: () => void) => void
    execute: (siteKey: string, options: { action: string }) => Promise<string>
    enterprise?: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

declare global {
  interface Window extends GoogleRecaptchaApi {}
}

export function useScriptGoogleRecaptcha<T extends GoogleRecaptchaApi>(_options?: GoogleRecaptchaInput) {
  return useRegistryScript<T, typeof GoogleRecaptchaOptions>(_options?.key || 'googleRecaptcha', (options) => {
    const baseUrl = options?.recaptchaNet
      ? 'https://www.recaptcha.net/recaptcha'
      : 'https://www.google.com/recaptcha'
    const scriptPath = options?.enterprise ? 'enterprise.js' : 'api.js'

    return {
      scriptInput: {
        src: withQuery(`${baseUrl}/${scriptPath}`, {
          render: options?.siteKey,
          hl: options?.hl,
        }),
        crossorigin: false,
      },
      schema: import.meta.dev ? GoogleRecaptchaOptions : undefined,
      scriptOptions: {
        use() {
          return { grecaptcha: window.grecaptcha }
        },
      },
      clientInit: import.meta.server
        ? undefined
        : () => {
            const w = window as any
            w.grecaptcha = w.grecaptcha || {}
            const readyFn = function (cb: () => void) {
              (w.___grecaptcha_cfg = w.___grecaptcha_cfg || {}).fns
                = (w.___grecaptcha_cfg.fns || []).concat([cb])
            }
            w.grecaptcha.ready = w.grecaptcha.ready || readyFn
            // Enterprise mode uses grecaptcha.enterprise.ready
            if (options?.enterprise) {
              w.grecaptcha.enterprise = w.grecaptcha.enterprise || {}
              w.grecaptcha.enterprise.ready = w.grecaptcha.enterprise.ready || readyFn
            }
          },
    }
  }, _options)
}
