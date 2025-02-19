import type { MaybeRef } from '@vueuse/core'
import type { HighlighterCore } from 'shiki'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { computed, ref, toValue } from 'vue'
import { devtools } from './rpc'

export const shiki = ref<HighlighterCore>()

export async function loadShiki() {
  shiki.value = await createHighlighterCore({
    themes: [
      import('@shikijs/themes/vitesse-light'),
      import('@shikijs/themes/vitesse-dark'),
    ],
    langs: [
      import('@shikijs/langs/javascript'),
    ],
    engine: createJavaScriptRegexEngine(),
  })

  return shiki.value
}

export function renderCodeHighlight(code: MaybeRef<string>, lang: 'javascript') {
  return computed(() => {
    const colorMode = devtools.value?.colorMode || 'light'
    return shiki.value!.codeToHtml(toValue(code) || '', {
      lang,
      theme: colorMode === 'dark' ? 'vitesse-dark' : 'vitesse-light',
    }) || ''
  })
}
