import { defu } from 'defu'
import type { BaseSchema, Input, ObjectSchema, ValiError } from 'valibot'
import type { UseScriptInput } from '@unhead/vue'
import { parse } from '#nuxt-scripts-validator'
import { useRuntimeConfig, useScript } from '#imports'
import type { NuxtConfigScriptRegistry, NuxtUseScriptOptions, RegistryScriptInput, ScriptRegistry } from '#nuxt-scripts'

function validateScriptInputSchema<T extends BaseSchema<any>>(key: string, schema: T, options?: Input<T>) {
  if (import.meta.dev) {
    try {
      parse(schema, options)
    }
    catch (_e) {
      const e = _e as ValiError
      // TODO nicer error handling
      console.error(e.issues.map(i => `${key}.${i.path?.map(i => i.key).join(',')}: ${i.message}`).join('\n'))
    }
  }
}

type OptionsFn<O extends ObjectSchema<any>> = (options: Input<O>) => ({
  scriptInput?: UseScriptInput
  scriptOptions?: NuxtUseScriptOptions
  schema?: O
  clientInit?: () => void
})

export function scriptRuntimeConfig(key: keyof ScriptRegistry) {
  return ((useRuntimeConfig().public.scripts || {}) as ScriptRegistry)[key] || {}
}

export function registryScript<T extends Record<string | symbol, any>, O extends ObjectSchema<any>>(key: keyof ScriptRegistry, optionsFn: OptionsFn<O>, _userOptions?: RegistryScriptInput<O>) {
  const userOptions = Object.assign(_userOptions || {}, scriptRuntimeConfig(key))
  const options = optionsFn(userOptions)

  const scriptInput = defu(options.scriptInput, { key }) as UseScriptInput
  const scriptOptions = Object.assign(_userOptions?.scriptOptions || {}, options.scriptOptions || {})
  const init = scriptOptions.beforeInit
  scriptOptions.beforeInit = () => {
    // a manual trigger also means it was disabled by nuxt.config
    import.meta.dev && !scriptOptions.skipValidation && options.schema && validateScriptInputSchema(key, options.schema, userOptions)
    // avoid clearing the user beforeInit
    init?.()
    if (import.meta.client) {
      // validate input in dev
      options.clientInit?.()
    }
  }
  return useScript<T>(scriptInput, scriptOptions)
}
