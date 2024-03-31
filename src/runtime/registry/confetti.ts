import { type Input, pick } from 'valibot'
import { NpmOptions, useScriptNpm } from './npm'
import type { NuxtUseScriptOptions } from '#nuxt-scripts'

export interface JSConfettiApi {
  addConfetti: (options?: { emojis: string[] }) => void
}

declare global {
  interface Window {
    JSConfetti: { new (): JSConfettiApi }
  }
}

export const JSConfettiOptions = pick(NpmOptions, ['version'])

export function useScriptConfetti<T extends JSConfettiApi>(options: Input<typeof JSConfettiOptions>, _scriptOptions: NuxtUseScriptOptions<T> = {}) {
  return useScriptNpm<T>({
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
