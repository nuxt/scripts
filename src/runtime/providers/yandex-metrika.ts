// import { useRouter } from '#app'
import { defineScriptProvider } from '../types'

export interface ProviderOptions {
  metrikaUrl?: string,
  globalName?: string
  id?: string,

  accurateTrackBounce?: boolean | number,
  childIframe?: boolean,
  clickmap?: boolean,
  defer?: boolean,
  ecommerce?: boolean | string | [],
  params?: object | [],
  userParams?: object,
  trackHash?: boolean,
  trackLinks?: boolean,
  trustedDomains?: [],
  type?: number,
  webvisor?: boolean,
  triggerEvent?: boolean,
}

function omitKeys<T extends Record<string, any>, K extends keyof T> (object: T, keys: K[]) {
  return Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key as K))) as Omit<T, K>
}

export default defineScriptProvider((options: ProviderOptions) => {
  return {
    onNavigation (to, from) {
      window.ym(id, 'hit', basePath + to.fullPath, {
        referer: basePath + from.fullPath
        // TODO: pass title: <new page title>
        // This will need special handling because router.afterEach is called *before* DOM is updated.
      })
    },
    render () {
      const metrikaUrl = options.metrikaUrl || 'https://cdn.jsdelivr.net/npm/yandex-metrica-watch/tag.js'
      const globalName = options.globalName || 'ym'
      const watchOptions = omitKeys(options, ['metrikaUrl', 'globalName'])
      return {
        scripts: [
          // async, defer, crossorigin, csp
          // string - just url
          { url: metrikaUrl, globalProvide: '_layer', sideeffects: true },
          {
            inline: `
          (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
          (window, document, "script", ${JSON.stringify(metrikaUrl)}, "${globalName}")
          window[${globalName}](${options.id}, "init", ${JSON.stringify(watchOptions)})
        `.trim()
          }
        ]
      }
    }
  }
})

function createScript(initOptions): Script {
  return { init, isLoaded, waitFor, call, prefetch }
}
