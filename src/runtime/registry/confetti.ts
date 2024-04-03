import { type Input, pick } from 'valibot'
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

export function useScriptConfetti(options: ConfettiInput, _scriptOptions: NuxtUseScriptIntegrationOptions = {}) {
  return useScriptNpm<ConfettiApi>({
    packageName: 'js-confetti',
    version: options.version,
    file: 'dist/js-confetti.browser.js',
  }, {
    ...options,
    use() {
      return new window.JSConfetti()
    },
  })
}
