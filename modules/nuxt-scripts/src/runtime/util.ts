import type { ScriptInstance } from '@unhead/schema'
import { injectHead } from '#imports'

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
