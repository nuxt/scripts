import type { ScriptInstance } from '@unhead/schema'
import { injectHead, useHead, useScript } from '@unhead/vue'
import type { Output } from 'third-party-capital'
import { isExternalScript } from 'third-party-capital'
import type { ThirdPartyScriptApi, ThirdPartyScriptOptions } from './types'
import { useStyles } from '#imports'

export interface ConvertThirdPartyCapitalInput<S, T> {
  data: Output
  mainScriptKey: string
  options: ThirdPartyScriptOptions<S, T>
  use: () => T | undefined | null
}

/**
 * convertThirdPartyCapital
 * 
 * Assigns input from Third-Party-Capital to the proper composable from Nuxt-Script. 
 * Stylesheets get loaded with 'useStyles' and scripts get injected with 'useHead' or loaded with 'useScript'.
 * 
 * @param props ConvertThirdPartyCapitalInput
 * @returns ThirdPartyScriptApi
 */
export function convertThirdPartyCapital<S, T>({ data, mainScriptKey, options, use }: ConvertThirdPartyCapitalInput<S, T>): ThirdPartyScriptApi<T> {
  const scripts = data.scripts ?? []
  const stylesheets = data.stylesheets ?? []
  let response = null

  useStyles(stylesheets, { assetStrategy: 'inline' })

  for (const script of scripts) {
    if (isExternalScript(script)) {
      const { key, url: src } = script
      if (key === mainScriptKey)
        response = useScript<T>({ key, src }, { ...options, use })

      else
        useScript<T>({ key, src }, { ...options })
    }
    else {
      const { key, code: innerHTML, location } = script
      const tagPosition = location === 'body' ? 'bodyOpen' : 'head'
      useHead({ script: [{ key, innerHTML, tagPosition }] })
    }
  }

  if (!response)
    throw new Error('No external main script found!')

  return response
}

/**
 * injectScript
 * 
 * Checks if a script with the 'key' value exists in head.
 * 
 * @param key string - represents the key of the script that's injected in the head.
 * @returns ScriptInstance
 */
export function injectScript<T>(key: string): undefined | ScriptInstance<T> {
  const head = injectHead()
  return head._scripts?.[key]
}

/**
 * validateRequiredOptions
 * 
 * Checks the options object if all keys from the required array are present. 
 * It returns early, if a script with the same key was already injected.
 * 
 * @param key string - represents the key of the script that's injected in the head.
 * @param options object - data to check for required keys to be present.
 * @param required array - each string in the array represents a key in the options object that should exist.
 * @returns void
 */
export function validateRequiredOptions<T extends Record<string, any>>(key: string, options: T, required: string[]): void {
  // if an instance already exists we can skip
  if (injectScript<T>(key))
    return
  const missingKeys = required.filter(key => !options[key])
  if (missingKeys.length)
    throw new Error(`[Nuxt Scripts] ${key} is missing required options: ${missingKeys.join(', ')}`)
}

/**
* validateEitherOrOptions
 * 
 * Checks the options object if either 'a' or 'b' param are present. 
 * It returns early, if a script with the same key was already injected.
 * 
 * @param key string - represents the key of the script that's injected in the head.
 * @param options object - data to check for keys 'a' or 'b' to be present.
 * @param a string - first option to check for.
 * @param b string - second option to check for.
 * @returns void
 */
export function validateEitherOrOptions<T extends Record<string, any>>(key: string, options: T, a: string, b: string): void {
  // if an instance already exists we can skip
  if (injectScript<T>(key))
    return

  if (options[a] && options[b])
    throw new Error(`[Nuxt Scripts] ${key} only requires one of these options: ${a} or ${b} }`)
  if (!options[a] && !options[b])
    throw new Error(`[Nuxt Scripts] ${key} requires one of these options: ${a} or ${b} }`)
}

/**
 * formatDimensionValue
 * 
 * Converts string representation of a number if needed.
 * 
 * @example
 * // returns 400px
 * formatDimensionValue('400')
 * @example
 * // returns 400px
 * formatDimensionValue('400px')
 * @example
 * // returns 400%
 * formatDimensionValue('400%')
 * 
 * @param value string - input to check.
 * @returns string
 */
export function formatDimensionValue(value: any) {
  if (value.slice(-2) === 'px') return value;
  if (value.slice(-1) === '%') return value;
  return `${value}px`
}
