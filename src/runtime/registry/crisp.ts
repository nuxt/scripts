import { useRegistryScript } from '../utils'
import { object, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

export const CrispOptions = object({
  /**
   * The Crisp ID.
   */
  id: string(),
})

export type CrispInput = RegistryScriptInput<typeof CrispOptions, false>

export interface CrispApi {
  push: (...args: any[]) => void
  is: (name: 'chat:opened' | 'chat:closed' | 'chat:visible' | 'chat:hidden' | 'chat:small' | 'chat:large' | 'session:ongoing' | 'website:available' | 'overlay:opened' | 'overlay:closed' | string) => boolean
  set: (name: 'message:text' | 'session:data' | 'session:segments' | 'session:event' | 'user:email' | 'user:phone' | 'user:nickname' | 'user:avatar' | 'user:company' | string, value: any) => void
  get: (name: 'chat:unread:count' | 'message:text' | 'session:identifier' | 'session:data' | 'user:email' | 'user:phone' | 'user:nickname' | 'user:avatar' | 'user:company' | string) => any
  do: (name: 'chat:open' | 'chat:close' | 'chat:toggle' | 'chat:show' | 'chat:hide' | 'helpdesk:search' | 'helpdesk:article:open' | 'helpdesk:query' | 'overlay:open' | 'overlay:close' | 'message:send' | 'message:show' | 'message:read' | 'message:thread:start' | 'message:thread:end' | 'session:reset' | 'trigger:run' | string, arg2?: any) => any
  on: (name: 'session:loaded' | 'chat:initiated' | 'chat:opened' | 'chat:closed' | 'message:sent' | 'message:received' | 'message:compose:sent' | 'message:compose:received' | 'user:email:changed' | 'user:phone:changed' | 'user:nickname:changed' | 'user:avatar:changed' | 'website:availability:changed' | 'helpdesk:queried' | string, callback: (...args: any[]) => any) => void
  off: (name: 'session:loaded' | 'chat:initiated' | 'chat:opened' | 'chat:closed' | 'message:sent' | 'message:received' | 'message:compose:sent' | 'message:compose:received' | 'user:email:changed' | 'user:phone:changed' | 'user:nickname:changed' | 'user:avatar:changed' | 'website:availability:changed' | 'helpdesk:queried' | string, callback: (...args: any[]) => any) => void
  config: (options: any) => void
  help: () => void
  [key: string]: any
}

declare global {
  interface Window {
    CRISP_READY_TRIGGER: () => void
    CRISP_WEBSITE_ID: string
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
          readyPromise = new Promise((resolve) => {
            window.CRISP_READY_TRIGGER = resolve
          })
        },
  }), _options)
}
