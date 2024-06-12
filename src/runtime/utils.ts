import { defu } from 'defu'
import type { GenericSchema, InferInput, ObjectSchema, ValiError} from 'valibot'
import type { UseScriptInput, VueScriptInstance } from '@unhead/vue'
import { parse } from '#nuxt-scripts-validator'
import { useRuntimeConfig, useScript } from '#imports'
import type {
  EmptyOptionsSchema,
  NuxtUseScriptOptions,
  RegistryScriptInput,
  ScriptRegistry,
} from '#nuxt-scripts'

function validateScriptInputSchema<T extends GenericSchema>(key: string, schema: T, options?: InferInput<T>) {
  if (import.meta.dev) {
    try {
      parse(schema, options)
    }
    catch (_e) {
      const e = _e as ValiError<any>
      // TODO nicer error handling
      // @ts-expect-error untyped?
      console.error(e.issues.map(i => `${key}.${i.path?.map(i => i.key).join(',')}: ${i.message}`).join('\n'))
    }
  }
}

type OptionsFn<O extends ObjectSchema<any, any>> = (options: InferInput<O>) => ({
  scriptInput?: UseScriptInput
  scriptOptions?: NuxtUseScriptOptions
  schema?: O
  clientInit?: () => void
})

export function scriptRuntimeConfig<T extends keyof ScriptRegistry>(key: T) {
  return ((useRuntimeConfig().public.scripts || {}) as ScriptRegistry)[key]
}

export function useRegistryScript<T extends Record<string | symbol, any>, O extends ObjectSchema<any, any> = EmptyOptionsSchema>(key: keyof ScriptRegistry | string, optionsFn: OptionsFn<O>, _userOptions?: RegistryScriptInput<O>): T & {
  $script: Promise<T> & VueScriptInstance<T>
} {
  const scriptConfig = scriptRuntimeConfig(key as keyof ScriptRegistry)
  const userOptions = Object.assign(_userOptions || {}, typeof scriptConfig === 'object' ? scriptConfig : {})
  const options = optionsFn(userOptions)

  const scriptInput = defu(userOptions.scriptInput, options.scriptInput, { key }) as any as UseScriptInput
  const scriptOptions = Object.assign(userOptions?.scriptOptions || {}, options.scriptOptions || {})
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
