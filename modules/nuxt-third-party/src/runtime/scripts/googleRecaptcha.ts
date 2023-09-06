import { defineThirdPartyScript } from '../util'
import type { ThirdPartyScriptOptions } from '../types'

export interface GoogleRecaptchaOptions {
  siteKey?: string
  // TODO full config
}

export interface GoogleRecaptchaApi {
  ready: (cb: () => void) => void
  execute: (siteKey: string, options: { action: 'submit' }) => void
  // TODO full API
}

declare global {
  interface Window {
    turnstile: GoogleRecaptchaApi
  }
}

export const GoogleRecaptcha = defineThirdPartyScript<GoogleRecaptchaOptions, GoogleRecaptchaApi>({
  setup() {
    return {
      key: 'google-recaptcha',
      use: () => window.turnstile,
      script: {
        src: 'https://www.google.com/recaptcha/api.js',
        defer: true,
        async: true,
      },
      // TODO implement full options API
    }
  },
})

export function useGoogleRecaptcha(options?: GoogleRecaptchaOptions, scriptOptions?: ThirdPartyScriptOptions) {
  // TODO reactivity
  return GoogleRecaptcha(options, scriptOptions)
}
