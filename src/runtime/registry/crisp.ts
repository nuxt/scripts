import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { CrispOptions } from './schemas'

export { CrispOptions }

export type CrispInput = RegistryScriptInput<typeof CrispOptions, false, false, false>

export interface CrispApi {
  push: (...args: any[]) => void
  is: (name: 'chat:opened' | 'chat:closed' | 'chat:visible' | 'chat:hidden' | 'chat:small' | 'chat:large' | 'session:ongoing' | 'website:available' | 'overlay:opened' | 'overlay:closed' | (string & {})) => boolean
  set: ((name: 'message:text' | 'user:email' | 'user:phone' | 'user:nickname' | 'user:avatar' | 'user:company', value: string) => void)
    & ((name: 'session:data', value: [[string, string | number | boolean], ...[string, string | number | boolean][]]) => void)
    & ((name: 'session:segments', value: string[]) => void)
    & ((name: 'session:event', value: [[string, Record<string, any>?, string?]]) => void)
    & ((name: (string & {}), value: any) => void)
  get: ((name: 'chat:unread:count') => number)
    & ((name: 'message:text' | 'session:identifier' | 'user:email' | 'user:phone' | 'user:nickname' | 'user:avatar' | 'user:company') => string)
    & ((name: 'session:data', key: string) => string | number | boolean)
    & ((name: (string & {})) => any)
  do: (name: 'chat:open' | 'chat:close' | 'chat:toggle' | 'chat:show' | 'chat:hide' | 'helpdesk:search' | 'helpdesk:article:open' | 'helpdesk:query' | 'overlay:open' | 'overlay:close' | 'message:send' | 'message:show' | 'message:read' | 'message:thread:start' | 'message:thread:end' | 'session:reset' | 'trigger:run', arg2?: any) => any
  on: (name: 'session:loaded' | 'chat:initiated' | 'chat:opened' | 'chat:closed' | 'message:sent' | 'message:received' | 'message:compose:sent' | 'message:compose:received' | 'user:email:changed' | 'user:phone:changed' | 'user:nickname:changed' | 'user:avatar:changed' | 'website:availability:changed' | 'helpdesk:queried' | (string & {}), callback: (...args: any[]) => any) => void
  off: (name: 'session:loaded' | 'chat:initiated' | 'chat:opened' | 'chat:closed' | 'message:sent' | 'message:received' | 'message:compose:sent' | 'message:compose:received' | 'user:email:changed' | 'user:phone:changed' | 'user:nickname:changed' | 'user:avatar:changed' | 'website:availability:changed' | 'helpdesk:queried' | (string & {}), callback: (...args: any[]) => any) => void
  config: ((name: 'container:index', value: number) => void)
    & ((name: 'color:theme', value: 'default' | 'amber' | 'black' | 'blue' | 'blue_grey' | 'light_blue' | 'brown' | 'cyan' | 'green' | 'light_green' | 'grey' | 'indigo' | 'orange' | 'deep_orange' | 'pink' | 'purple' | 'deep_purple' | 'red' | 'teal') => void)
    & ((name: 'position:reverse' | 'hide:on:mobile' | 'hide:on:away' | 'lock:maximized' | 'lock:fullview' | 'show:operator:count' | 'sound:mute', value: boolean) => void)
    & ((name: (string & {}), value: any) => void)
  help: () => void
  [key: string]: any
}

declare global {
  interface Window {
    CRISP_READY_TRIGGER: () => void
    CRISP_WEBSITE_ID: string
    CRISP_RUNTIME_CONFIG?: { locale?: string }
    CRISP_COOKIE_DOMAIN?: string
    CRISP_COOKIE_EXPIRATION?: number
    CRISP_TOKEN_ID?: string
    $crisp: CrispApi
  }
}

export function useScriptCrisp<T extends CrispApi>(_options?: CrispInput) {
  let readyPromise: Promise<void> = Promise.resolve()
  return useRegistryScript<T, typeof CrispOptions>('crisp', options => ({
    scriptInput: {
      src: 'https://client.crisp.chat/l.js', // can't be bundled
    },
    schema: import.meta.dev ? CrispOptions : undefined,
    scriptOptions: {
      use() {
        const wrapFn = (fn: any) => window.$crisp?.[fn] || ((...args: any[]) => {
          readyPromise.then(() => window.$crisp[fn](...args))
        })
        return {
          push: window.$crisp.push,
          do: wrapFn('do'),
          set: wrapFn('set'),
          get: wrapFn('get'),
          on: wrapFn('on'),
          off: wrapFn('off'),
          config: wrapFn('config'),
          help: wrapFn('help'),
        }
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
        // @ts-expect-error untyped
          window.$crisp = []
          window.CRISP_WEBSITE_ID = options.id
          if (options.runtimeConfig?.locale)
            window.CRISP_RUNTIME_CONFIG = { locale: options.runtimeConfig.locale }
          if (options.cookieDomain)
            window.CRISP_COOKIE_DOMAIN = options.cookieDomain
          if (options.cookieExpiry)
            window.CRISP_COOKIE_EXPIRATION = options.cookieExpiry
          if (options.tokenId)
            window.CRISP_TOKEN_ID = options.tokenId
          readyPromise = new Promise((resolve) => {
            window.CRISP_READY_TRIGGER = resolve
          })
        },
  }), _options)
}
