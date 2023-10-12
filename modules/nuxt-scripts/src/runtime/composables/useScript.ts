import { useScript as _useScript } from '@unhead/vue'
import type { Script, UseScriptInput, UseScriptOptions } from '@unhead/schema'
import type { MaybeComputedRefEntries } from '@unhead/vue'
import { useInlineAsset, useNuxtApp, useProxyAsset } from '#imports'

export type NuxtUseScriptOptions<T> = UseScriptOptions<T> & {
  assetStrategy?: 'proxy' | 'inline'
}

export function useScript<T>(input: MaybeComputedRefEntries<UseScriptInput>, options?: NuxtUseScriptOptions<T>) {
  options = options || {}
  const assetStrategy = options.assetStrategy
  const nuxtApp = useNuxtApp()
  return _useScript<T>(input, {
    async transform(script: Script) {
      if (typeof script.src === 'string' && script.src) {
        if (assetStrategy === 'proxy') {
          script.src = await nuxtApp.runWithContext(() => useProxyAsset(script.src as string)) }
        else if (assetStrategy === 'inline') {
          // TODO handle errors and checksums
          script.innerHTML = await nuxtApp.runWithContext(() => useInlineAsset(script.src as string).then(a => a.innerHTML))
          delete script.src
        }
      }
      return script
    },
    ...options,
  })
}
