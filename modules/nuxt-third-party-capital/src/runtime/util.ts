import type { ScriptInstance, UseScriptOptions } from '@unhead/schema'
import { injectHead, useHead, useScript } from '@unhead/vue'
import type { Output } from 'third-party-capital'
import { isExternalScript } from 'third-party-capital'
import type { ThirdPartyScriptApi } from '../types'

export interface ConvertThirdPartyCapitalInput<T> {
  data: Output
  mainScriptKey: string
  options: UseScriptOptions<T>
  use: () => T | undefined | null
}

export function convertThirdPartyCapital<T>({ data, mainScriptKey, options, use }: ConvertThirdPartyCapitalInput<T>): ThirdPartyScriptApi<T> {
  const scripts = data.scripts ?? []
  let response = null

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

export function injectScript<T>(key: string): undefined | ScriptInstance<T> {
  const head = injectHead()
  return head._scripts?.[key]
}

export function validateRequiredOptions<T extends Record<string, any>>(key: string, options: T, required: string[]): void {
  // if an instance already exists we can skip
  if (injectScript<T>(key))
    return
  const missingKeys = required.filter(key => !options[key])
  if (missingKeys.length)
    throw new Error(`[Nuxt Scripts] ${key} is missing required options: ${missingKeys.join(', ')}`)
}
