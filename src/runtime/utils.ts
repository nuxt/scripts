import { defu } from 'defu'
import type { GenericSchema, InferInput, ObjectSchema, ValiError } from 'valibot'
import type { UseScriptInput } from '@unhead/vue'
import { useRuntimeConfig } from 'nuxt/app'
import { useScript } from '#imports'
import { parse } from '#nuxt-scripts-validator'
import type {
  EmptyOptionsSchema,
  InferIfSchema,
  NuxtUseScriptOptions,
  RegistryScriptInput,
  ScriptRegistry,
} from '#nuxt-scripts/types'

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

type OptionsFn<O> = (options: InferIfSchema<O>) => ({
  scriptInput?: UseScriptInput
  scriptOptions?: NuxtUseScriptOptions
  schema?: O extends ObjectSchema<any, any> ? O : undefined
  clientInit?: () => void
})

export function scriptRuntimeConfig<T extends keyof ScriptRegistry>(key: T) {
  return ((useRuntimeConfig().public.scripts || {}) as ScriptRegistry)[key]
}

export function useRegistryScript<T extends Record<string | symbol, any>, O = EmptyOptionsSchema, U = {}>(registryKey: keyof ScriptRegistry | string, optionsFn: OptionsFn<O>, _userOptions?: RegistryScriptInput<O>) {
  const scriptConfig = scriptRuntimeConfig(registryKey as keyof ScriptRegistry)
  const userOptions = Object.assign(_userOptions || {}, typeof scriptConfig === 'object' ? scriptConfig : {})
  const options = optionsFn(userOptions as InferIfSchema<O>)

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
  return useScript<T, U>(scriptInput, scriptOptions as NuxtUseScriptOptions<T>)
}

export function pick(obj: Record<string, any>, keys: string[]) {
  const res: Record<string, any> = {}
  for (const k of keys) {
    if (k in obj) {
      res[k] = obj[k]
    }
  }
  return res
}
