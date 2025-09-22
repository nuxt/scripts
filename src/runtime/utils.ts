import { defu } from 'defu'
import type { GenericSchema, InferInput, ObjectSchema, ValiError } from 'valibot'
import type { UseScriptInput } from '@unhead/vue'
import { useRuntimeConfig } from 'nuxt/app'
import { useScript } from './composables/useScript'
import { parse } from '#nuxt-scripts-validator'
import type {
  EmptyOptionsSchema,
  InferIfSchema,
  NuxtUseScriptOptions,
  RegistryScriptInput,
  UseFunctionType,
  ScriptRegistry, UseScriptContext,
} from '#nuxt-scripts/types'
import { parseQuery, parseURL, withQuery } from 'ufo'

export type MaybePromise<T> = Promise<T> | T

function validateScriptInputSchema<T extends GenericSchema>(key: string, schema: T, options?: InferInput<T>) {
  if (import.meta.dev) {
    try {
      parse(schema, options)
    }
    catch (_e) {
      const e = _e as ValiError<any>
      console.error(e.issues.map(i => `${key}.${i.path?.map(i => i.key).join(',')}: ${i.message}`).join('\n'))
      return e
    }
  }
  return null
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

export function useRegistryScript<T extends Record<string | symbol, any>, O = EmptyOptionsSchema>(registryKey: keyof ScriptRegistry | string, optionsFn: OptionsFn<O>, _userOptions?: RegistryScriptInput<O>): UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T>, T>> {
  const scriptConfig = scriptRuntimeConfig(registryKey as keyof ScriptRegistry)
  const userOptions = Object.assign(_userOptions || {}, typeof scriptConfig === 'object' ? scriptConfig : {})
  const options = optionsFn(userOptions as InferIfSchema<O>, { scriptInput: userOptions.scriptInput as UseScriptInput & { src?: string } })

  let finalScriptInput = options.scriptInput

  // If user provided a custom src and the options function returned a src with query params,
  // extract those query params and apply them to the user's custom src
  const userSrc = (userOptions.scriptInput as any)?.src
  const optionsSrc = (options.scriptInput as any)?.src

  if (userSrc && optionsSrc && typeof optionsSrc === 'string' && typeof userSrc === 'string') {
    const defaultUrl = parseURL(optionsSrc)
    const customUrl = parseURL(userSrc)

    // Merge query params: user params override default params
    const defaultQuery = parseQuery(defaultUrl.search || '')
    const customQuery = parseQuery(customUrl.search || '')
    const mergedQuery = { ...defaultQuery, ...customQuery }

    // Build the final URL with the custom base and merged query params
    const baseUrl = customUrl.href?.split('?')[0] || userSrc

    finalScriptInput = {
      ...((options.scriptInput as object) || {}),
      src: withQuery(baseUrl, mergedQuery),
    }
  }

  const scriptInput = defu(finalScriptInput, userOptions.scriptInput, { key: registryKey }) as any as UseScriptInput
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

  if (import.meta.dev) {
    scriptOptions._validate = () => {
      // a manual trigger also means it was disabled by nuxt.config
      // overriding the src will skip validation
      if (!userOptions.scriptInput?.src && !scriptOptions.skipValidation && options.schema) {
        return validateScriptInputSchema(registryKey, options.schema, userOptions)
      }
    }
  }
  // wrap beforeInit to add validation
  scriptOptions.beforeInit = () => {
    // avoid clearing the user beforeInit
    init?.()
    if (import.meta.client) {
      // validate input in dev
      options.clientInit?.()
    }
  }
  return useScript<T>(scriptInput, scriptOptions as NuxtUseScriptOptions<T>)
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
