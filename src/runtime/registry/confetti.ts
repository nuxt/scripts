import { pick } from 'valibot'
import { registryScriptOptions } from '../utils'
import { NpmOptions, useScriptNpm } from './npm'
import type { RegistryScriptInput } from '#nuxt-scripts'

export interface ConfettiApi {
  addConfetti: (options?: { emojis: string[] }) => void
}

declare global {
  interface Window {
    JSConfetti: { new (): ConfettiApi }
  }
}

export const ConfettiOptions = pick(NpmOptions, ['version'])
export type ConfettiInput = RegistryScriptInput<typeof ConfettiOptions>

export function useScriptConfetti<T extends ConfettiApi>(options?: ConfettiInput) {
  return useScriptNpm<T>({
    packageName: 'js-confetti',
    version: options?.version,
    file: 'dist/js-confetti.browser.js',
  }, {
    ...registryScriptOptions({
      scriptOptions,
      schema: ConfettiOptions,
      options,
    }),
    use() {
      if (typeof window.JSConfetti === 'undefined')
        return null
      return new window.JSConfetti()
    },
  })
}
