import { useScript } from '#imports'
import type { NuxtUseScriptOptions } from '#nuxt-scripts'

export interface JSConfettiApi {
  addConfetti: (options?: { emojis: string[] }) => void
}

declare global {
  interface Window {
    JSConfetti: { new (): JSConfettiApi }
  }
}

export function useScriptConfetti<T extends JSConfettiApi>(options: NuxtUseScriptOptions<T> = {}) {
  return useScript<T>({
    src: 'https://cdn.jsdelivr.net/npm/js-confetti@latest/dist/js-confetti.browser.js',
  }, {
    ...options,
    use() {
      return new window.JSConfetti()
    },
  })
}
