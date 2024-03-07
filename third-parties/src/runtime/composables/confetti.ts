import type { ThirdPartyScriptOptions } from '../types'
import { useScript } from '#imports'

export interface JSConfettiOptions {}
export interface JSConfettiApi {
  addConfetti: (options?: { emojis: string[] }) => void
}

declare global {
  interface Window {
    JSConfetti: { new (): JSConfettiApi }
  }
}

export function useConfetti(options: ThirdPartyScriptOptions<JSConfettiOptions, JSConfettiApi> = {}) {
  return useScript<JSConfettiApi>({
    key: 'confetti',
    src: 'https://cdn.jsdelivr.net/npm/js-confetti@latest/dist/js-confetti.browser.js',
  }, {
    ...options,
    use() {
      return new window.JSConfetti()
    },
  })
}
