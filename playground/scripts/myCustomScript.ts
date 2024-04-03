import { type Input, object, string } from 'valibot'
import { useScript } from '#imports'
import type { NuxtUseScriptOptions } from '#nuxt-scripts'

export interface MyCustomScriptApi {
}

export const MyCustomScriptOptions = object({
  id: string(),
})

export type MyCustomScriptInput = Input<typeof MyCustomScriptOptions>

declare global {
  interface Window {
    customScript: MyCustomScriptApi
  }
}

export function useScriptCustom<T extends MyCustomScriptApi>(options?: MyCustomScriptInput, _scriptOptions?: Omit<NuxtUseScriptOptions<T>, 'beforeInit' | 'use'>) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {}
  return useScript<MyCustomScriptApi>({
    key: 'myCustomScript',
    src: 'https://example.com/script.js',
    ...options,
  }, {
    ...scriptOptions,
    use: () => window.fathom,
  })
}
