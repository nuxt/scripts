import { defu } from 'defu'
import type { type BaseSchema, type Input, ObjectSchema, parse } from 'valibot'
import type { UseScriptInput } from '@unhead/vue'
import { createError, useRuntimeConfig, useScript } from '#imports'
import type { NuxtUseScriptOptions, RegistryScriptInput } from '#nuxt-scripts'

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

type OptionsFn<O extends ObjectSchema<any>> = (options: Input<O>) => ({
  scriptInput?: UseScriptInput
  scriptOptions?: NuxtUseScriptOptions
  schema?: O
  clientInit?: () => void
})

export function registryScript<T extends Record<string | symbol, any>, O extends ObjectSchema<any>>(key: string, optionsFn: OptionsFn<O>, _userOptions?: RegistryScriptInput<O>) {
  const runtimeConfig = useRuntimeConfig().public.scripts || {}
  const runtimeOptions = runtimeConfig[key]
  const userOptions = defu(_userOptions, runtimeOptions, {})
  const options = optionsFn(userOptions)

  const scriptInput = defu({ key }, options.scriptInput) as UseScriptInput
  const scriptOptions = options.scriptOptions || {}
  const init = scriptOptions.beforeInit
  scriptOptions.beforeInit = () => {
    // validate input in dev
    import.meta.dev && options.schema && validateScriptInputSchema(options.schema, userOptions)
    // avoid clearing the user beforeInit
    init?.()
    import.meta.client && options.clientInit?.()
  }
  return useScript<T>(scriptInput, scriptOptions)
}
