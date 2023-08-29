import { defineThirdParty } from '../util'
import { useScript } from '#imports'

export interface GoogleAnalyticsOptions {
  id: string
}

type gtagApi = ((fn: 'js', opt: Date) => void) | ((fn: 'config', opt: string) => void)

export const GoogleAnalytics = defineThirdParty<GoogleAnalyticsOptions>((options, ctx) => {
  useScript({
    mode: ctx.global ? 'server' : undefined,
    innerHTML: `window.dataLayer=window.dataLayer||[];window.gtag=function gtag() {window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config', ${JSON.stringify(options.id)})`,
  })
  // TODO handle worker
  return useScript({
    mode: ctx.global ? 'server' : undefined,
    src: `https://www.googletagmanager.com/gtag/js?id=${options.id}`,
  })
})

export async function useGoogleAnalytics(options: GoogleAnalyticsOptions) {
  // setup
  await GoogleAnalytics(options, { global: false, webworker: false }).waitForLoad()
  // use global
  return window.gtag as gtagApi
}
