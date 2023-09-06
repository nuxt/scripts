import type { UniversalScript, UseScriptOptions } from '@nuxt/scripts/src/runtime/types'
import { defu } from 'defu'
import type { ThirdPartyScriptOptions } from './types'
import { useScript } from '#imports'

export interface ThirdPartyCompatibility {
  webworker?: boolean
  mode?: 'server' | 'client'
}

export interface ThirdPartyInput<Options, Api> extends ThirdPartyCompatibility {
  setup: (options: Options) => UseScriptOptions<Api>
  mock?: Record<string | symbol, any>
}

export function defineThirdPartyScript<Options, Api>(thirdParty: ThirdPartyInput<Options, Api>): (thirdPartyOptions?: Options, scriptOptions?: ThirdPartyScriptOptions) => Api & { $script: UniversalScript<Api> } {
  // augment a use function
  return (thirdPartyOptions?: Options, scriptOptions?: ThirdPartyScriptOptions) => {
    const useScriptInput = defu(thirdParty.setup(thirdPartyOptions || {} as Options), scriptOptions)
    const script = useScript<Api>(useScriptInput)
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
