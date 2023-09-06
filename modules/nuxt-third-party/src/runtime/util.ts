import type { UniversalScript } from '@nuxt/scripts/src/runtime/types'

export interface ThirdPartyCompatibility {
  webworker?: boolean
  mode?: 'server' | 'client'
}

export interface ThirdPartyInput<Options, Api> extends ThirdPartyCompatibility {
  setup: (options: Options) => UniversalScript<Api>
  mock?: Record<string | symbol, any>
}

export function defineThirdPartyScript<Options, Api>(thirdParty: ThirdPartyInput<Options, Api>): (options?: Options) => Api & { $script: UniversalScript<Api> } {
  // augment a use function
  return (options?: Options) => {
    options = options || {} as Options
    const script = thirdParty.setup(options)
    return new Proxy({}, {
      get(_, fn) {
        if (fn === '$script')
          return script
        if (thirdParty.mock?.[fn])
          return thirdParty.mock[fn]
        return (...args: any[]) => {
          // third party scripts only run on client-side, mock the function
          if (process.server)
            return
          // TODO mock invalid environments
          if (script.loaded.value) {
            const api = script.use()
            // @ts-expect-error untyped
            api[fn](...args)
          }
          else {
            script.waitForLoad().then(
              (api) => {
                // @ts-expect-error untyped
                api[fn](...args)
              },
            )
          }
        }
      },
    }) as any as Api & { $script: UniversalScript<Api> }
  }
}
