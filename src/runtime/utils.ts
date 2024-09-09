import { defu } from 'defu'
import type { GenericSchema, InferInput, ObjectSchema, ValiError } from 'valibot'
import type { UseScriptInput } from '@unhead/vue'
import { useScript } from './composables/useScript'
import { parse } from '#nuxt-scripts-validator'
import { useRuntimeConfig } from '#imports'
import type {
  EmptyOptionsSchema,
  NuxtUseScriptOptions,
  RegistryScriptInput,
  ScriptRegistry,
} from '#nuxt-scripts'

export type MaybePromise<T> = Promise<T> | T

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

export function useRegistryScript<T extends Record<string | symbol, any>, O extends ObjectSchema<any, any> = EmptyOptionsSchema, U = {}>(registryKey: keyof ScriptRegistry | string, optionsFn: OptionsFn<O>, _userOptions?: RegistryScriptInput<O>) {
  const scriptConfig = scriptRuntimeConfig(registryKey as keyof ScriptRegistry)
  const userOptions = Object.assign(_userOptions || {}, typeof scriptConfig === 'object' ? scriptConfig : {})
  const options = optionsFn(userOptions)

  const scriptInput = defu(userOptions.scriptInput, options.scriptInput, { key: registryKey }) as any as UseScriptInput
  const scriptOptions = Object.assign(userOptions?.scriptOptions || {}, options.scriptOptions || {})
  if (import.meta.dev) {
    scriptOptions.devtools = defu(scriptOptions.devtools, { registryKey })
    if (options.schema) {
      const registryMeta: Record<string, string> = {}
      for (const k in options.schema.entries) {
        if (options.schema.entries[k].type !== 'optional') {
          registryMeta[k] = String(userOptions[k as any as keyof typeof userOptions])
        }
      }
      scriptOptions.devtools.registryMeta = registryMeta
    }
  }
  const init = scriptOptions.beforeInit
  scriptOptions.beforeInit = () => {
    // a manual trigger also means it was disabled by nuxt.config
    if (import.meta.dev && !scriptOptions.skipValidation && options.schema) {
      // overriding the src will skip validation
      if (!userOptions.scriptInput?.src) {
        validateScriptInputSchema(registryKey, options.schema, userOptions)
      }
    }
    // avoid clearing the user beforeInit
    init?.()
    if (import.meta.client) {
      // validate input in dev
      options.clientInit?.()
    }
  }
  return useScript<T, U>(scriptInput, scriptOptions as NuxtUseScriptOptions<T, U>)
}
