import { defu } from 'defu'
import type { BaseSchema, Input, ObjectSchema } from 'valibot'
import type { UseScriptInput } from '@unhead/vue'
import { parse } from '#nuxt-scripts-validator'
import { createError, useRuntimeConfig, useScript } from '#imports'
import type { NuxtUseScriptOptions, RegistryScriptInput } from '#nuxt-scripts'

function validateScriptInputSchema<T extends BaseSchema<any>>(key: string, schema: T, options?: Input<T>) {
  if (import.meta.dev) {
    try {
      parse(schema, options)
    }
    catch (e) {
      // TODO nicer error handling
      createError({
        cause: e,
        message: `Invalid script options for ${key}`,
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
  const userOptions = Object.assign(_userOptions || {}, runtimeOptions || {})
  const options = optionsFn(userOptions)

  const scriptInput = defu(options.scriptInput, { key }) as UseScriptInput
  const scriptOptions = Object.assign(_userOptions?.scriptOptions || {}, options.scriptOptions || {})
  const init = scriptOptions.beforeInit
  scriptOptions.beforeInit = () => {
    // validate input in dev
    import.meta.dev && options.schema && validateScriptInputSchema(key, options.schema, userOptions)
    // avoid clearing the user beforeInit
    init?.()
    import.meta.client && options.clientInit?.()
  }
  return useScript<T>(scriptInput, scriptOptions)
}
