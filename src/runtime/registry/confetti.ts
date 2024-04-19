import { type Input, pick } from 'valibot'
import { registryScriptOptions } from '../utils'
import { NpmOptions, useScriptNpm } from './npm'
import type { NuxtUseScriptIntegrationOptions } from '#nuxt-scripts'

export interface ConfettiApi {
  addConfetti: (options?: { emojis: string[] }) => void
}

declare global {
  interface Window {
    JSConfetti: { new (): ConfettiApi }
  }
}

export const ConfettiOptions = pick(NpmOptions, ['version'])
export type ConfettiInput = Input<typeof ConfettiOptions>

export function useScriptConfetti<T extends ConfettiApi>(options: ConfettiInput, scriptOptions?: NuxtUseScriptIntegrationOptions) {
  return useScriptNpm<T>({
    packageName: 'js-confetti',
    version: options.version,
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
