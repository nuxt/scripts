import type { ScriptInstance, UseScriptOptions } from '@nuxt/scripts/src/runtime/types'
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

export function defineThirdPartyScript<Options, Api>(thirdParty: ThirdPartyInput<Options, Api>): (thirdPartyOptions?: Options, scriptOptions?: ThirdPartyScriptOptions) => Api & { $script: ScriptInstance<Api> } {
  // augment a use function
  return (thirdPartyOptions?: Options, scriptOptions?: ThirdPartyScriptOptions) => {
    const useScriptInput = defu(thirdParty.setup(thirdPartyOptions || {} as Options), scriptOptions)
    return useScript<Api>(useScriptInput)
  }
}
