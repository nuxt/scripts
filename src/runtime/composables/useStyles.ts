import type { ActiveHeadEntry, MergeHead, UseHeadInput } from '@unhead/vue'
import type { MaybeRefOrGetter } from '#imports'
import { computed, toValue, useHead, useInlineAsset, useNuxtApp, useProxyAsset } from '#imports'

interface NuxtUseStyleSheetOptions {
  assetStrategy?: 'proxy' | 'inline'
}

export function useStyles(sources: MaybeRefOrGetter<string[]>, options: NuxtUseStyleSheetOptions = {}): void | ActiveHeadEntry<UseHeadInput<MergeHead>> {
  if (import.meta.client) {
    return useHead(computed(() => ({
      link: toValue(sources).map(link => ({ rel: 'stylesheet', href: link, key: link })),
    })))
  }

  const nuxtApp = useNuxtApp()

  return useHead({
    style: sources,
  }, {
    async transform(_inputs) {
      const inputs = _inputs as { style: string[] }
      const { assetStrategy } = options
      if (!assetStrategy) {
        return {
          link: inputs.style.map((input) => {
            return {
              href: input,
              key: input,
              rel: 'stylesheet',
            }
          }),
        }
      }

      if (assetStrategy === 'inline') {
        return {
          style: await Promise.all(inputs.style.map(async (input) => {
            const html = await nuxtApp.runWithContext(() => useInlineAsset(input).then(result => result.innerHTML))
            return {
              innerHTML: html,
              key: input,
            }
          })),
        }
      }
      return {
        link: await Promise.all(inputs.style.map(async (input) => {
          return {
            href: await nuxtApp.runWithContext(() => useProxyAsset(input)),
            key: input,
            rel: 'stylesheet',
          }
        })),
      }
    },
  })
}
