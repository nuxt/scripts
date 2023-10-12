import type { ThirdPartyScriptOptions } from '../../types'
import { useScript } from '#imports'

export interface GoogleRecaptchaOptions {
  siteKey: string
  // TODO full config
}

export interface GoogleRecaptchaApi {
  ready: (cb: () => void) => void
  execute: (siteKey: string, options: { action: 'submit' }) => void
  // TODO full API
}

declare global {
  interface Window {
    grecaptcha: GoogleRecaptchaApi
  }
}

export function useGoogleRecaptcha(options: ThirdPartyScriptOptions<GoogleRecaptchaOptions, GoogleRecaptchaApi> = {}) {
  return useScript<GoogleRecaptchaApi>({
    key: 'recaptcha',
    src: 'https://www.google.com/recaptcha/api.js',
    defer: true,
    async: true,
  }, {
    ...options,
    use: () => window.grecaptcha,
  })
}
