import { useScript as _useScript } from '@unhead/vue'
import type { Script, UseScriptInput, UseScriptOptions } from '@unhead/schema'
import type { M as MaybeComputedRefEntries } from '@unhead/vue/dist/shared/vue.8eef6ffc'
import { useInlineAsset, useProxyAsset } from '#imports'

type NuxtUseScriptOptions<T> = UseScriptOptions<T> & {
  assetStrategy?: 'proxy' | 'inline'
}

export function useScript<T>(input: MaybeComputedRefEntries<UseScriptInput>, options?: NuxtUseScriptOptions<T>) {
  options = options || {}
  const assetStrategy = options.assetStrategy

  return _useScript<T>(input, {
    transform(script: Script) {
      if (typeof script.src === 'string' && script.src) {
        if (assetStrategy === 'proxy')
          script.src = useProxyAsset(script.src)
        else if (assetStrategy === 'inline')
          // TODO handle errors and checksums
          script = useInlineAsset(script.src) as Script
      }
      return script
    },
    ...options,
  })
}
