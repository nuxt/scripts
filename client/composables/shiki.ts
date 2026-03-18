import type { HighlighterCore } from 'shiki'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { computed, ref, toValue } from 'vue'
import type { MaybeRef } from '@vueuse/core'
import { devtools } from './rpc'

export const shiki = ref<HighlighterCore>()

export function loadShiki() {
  // Only loading when needed
  return createHighlighterCore({
    themes: [
      import('@shikijs/themes/vitesse-light'),
      import('@shikijs/themes/vitesse-dark'),
    ],
    langs: [
      import('@shikijs/langs/json'),
      import('@shikijs/langs/typescript'),
    ],
    engine: createJavaScriptRegexEngine(),
  }).then((i) => {
    shiki.value = i
  })
}

export function renderCodeHighlight(code: MaybeRef<string>, lang: 'json' | 'typescript') {
  return computed(() => {
    const colorMode = devtools.value?.colorMode || 'light'
    return shiki.value!.codeToHtml(toValue(code), {
      lang,
      theme: colorMode === 'dark' ? 'vitesse-dark' : 'vitesse-light',
    }) || ''
  })
}
