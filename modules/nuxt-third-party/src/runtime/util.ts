import type { UniversalScript } from '@nuxt/scripts/src/runtime/types'

export interface ThirdPartyCompatibility {
  webworker?: boolean
  mode?: 'server' | 'client'
}

export interface ThirdPartyInput<Options, Api> extends ThirdPartyCompatibility {
  setup: (options: Options) => UniversalScript<Api>
}

export interface ThirdPartyDefinition<Options, Api> extends ThirdPartyInput<Options, Api> {
  resolve: (options?: Options) => Api & { $script: UniversalScript<Api> }
  script: UniversalScript<Api>
}

export function defineThirdPartyScript<Options, Api>(thirdParty: ThirdPartyInput<Options, Api>): ThirdPartyDefinition<Options, Api> {
  // augment a use function
  const tp = thirdParty as ThirdPartyDefinition<Options, Api>
  tp.resolve = (options?: Options) => {
    options = options || {} as Options
    tp.script = tp.script || tp.setup(options)
    return new Proxy({}, {
      get(_, fn) {
        if (fn === '$script')
          return tp.script
        return (...args: any[]) => {
          // third party scripts only run on client-side, mock the function
          if (process.server)
            return
          // TODO mock invalid environments
          if (tp.script.loaded.value) {
            const api = tp.script.use()
            // @ts-expect-error untyped
            api[fn](...args)
          }
          else {
            tp.script.waitForLoad().then(
              (api) => {
                // @ts-expect-error untyped
                api[fn](...args)
              },
            )
          }
        }
      },
    }) as Api & { $script: UniversalScript<Api> }
  }
  return tp
}
