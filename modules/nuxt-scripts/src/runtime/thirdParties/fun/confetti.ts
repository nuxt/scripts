import type { NuxtUseScriptOptions } from '../../composables/useScript'
import { useScript } from '../../composables/useScript'

interface JSConfetti {
  addConfetti: (options?: { emoji: string[] }) => void
}

declare global {
  interface Window {
    JSConfetti: { new (): JSConfetti }
  }
}

export function useConfetti(scriptOptions: NuxtUseScriptOptions<JSConfetti> = {}) {
  return useScript<JSConfetti>({
    key: 'confetti',
    src: 'https://cdn.jsdelivr.net/npm/js-confetti@latest/dist/js-confetti.browser.js',
  }, {
    ...scriptOptions,
    use() {
      return new window.JSConfetti()
    },
  })
}
