import { useScript, useRuntimeConfig } from '#imports'
import type {NuxtUseScriptIntegrationOptions, NuxtUseScriptOptions, RegistryScriptInput} from '#nuxt-scripts'
import {defu} from "defu";
import { type BaseSchema, type Input, parse } from 'valibot'
import { createError } from '#imports'


// TODO remove if not planning to use
export function mockFallbackScript(name: string, module: string) {
  console.error(`${name} is provided by ${module}. Check your console to install it or run 'npx nuxi@latest module add ${module}'`)
  return useScript('', { trigger: 'manual' })
}

function validateScriptInputSchema<T extends BaseSchema<any>>(schema: T, options?: Input<T>) {
  if (import.meta.dev) {
    try {
      parse(schema, options)
    }
    catch (e) {
      // TODO nicer error handling
      createError({
        cause: e,
        message: 'Invalid script options',
      })
    }
  }
}


export function registryScript<T, O>(key: string, optionsFn: (runtimeOptions: O) => RegistryScriptInput<T> & NuxtUseScriptOptions & { schema?: BaseSchema<any>, clientInit?: () => void }, userOptions?: RegistryScriptInput<T>) {
  const runtimeConfig = useRuntimeConfig().public.scripts || {}
  const runtimeOptions = runtimeConfig[key]
  const options = optionsFn(defu(userOptions, runtimeOptions))

  const scriptInput = defu(userOptions?.scriptInput, options.scriptInput)
  const scriptOptions: NuxtUseScriptIntegrationOptions = options.scriptOptions || {}
  const init = options.scriptOptions?.beforeInit
  scriptOptions.beforeInit = () => {
    // validate input in dev
    import.meta.dev && options.schema && validateScriptInputSchema(options.schema, options)
    // avoid clearing the user beforeInit
    init?.()
    import.meta.client && options.clientInit?.()
  }
  return useScript<T>({
    ...scriptInput,
    key,
  }, scriptOptions)
}

