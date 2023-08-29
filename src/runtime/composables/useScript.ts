import { UseScriptInput, UseScriptReturn, UseScriptStatus } from "../types";
import { ref, toValue, computed } from 'vue'
import {useRequestEvent, injectHead, useNuxtApp } from '#imports'
import type {Head, RuntimeMode} from '@unhead/schema'
import {ScriptBase} from "zhead";
import { hash } from 'ohash'

/**
 * Requirements
 *
 * - This script will load and execute when any route in your application is accessed.
 * Next.js will ensure the script will only load once, even if a user navigates between multiple pages.
 *
 * onLoad: Execute code after the script has finished loading.
 * onReady: Execute code after the script has finished loading and every time the component is mounted.
 * onError: Execute code if the script fails to load.
 *
 * - innerHTML
 */

export function useScript(input: UseScriptInput): Promise<UseScriptReturn>|UseScriptReturn {
  const error = ref<Error | null>(null)

  const resolvedInput = toValue(input)

  const presets = resolvedInput.presets || []
  delete input.presets

  const status = ref<UseScriptStatus>('awaitingLoad')

  // assign a key based on src
  const key = input.key || `nuxt-script-${hash(resolvedInput.src || resolvedInput.innerHTML)}`
  input.key = key

  const nuxtApp = useNuxtApp()
  // need to stub out the onload function
  const onload = input.onload || (() => {})
  input.onload = () => {
    status.value = 'loaded'
    nuxtApp.runWithContext(onload)
  }

  const mode: RuntimeMode = input.mode || 'all'
  if(input.mode) {
    delete input.mode
  }

  const requestEvent = process.server ? useRequestEvent() : null

  const scriptLoadCtx = {
    loadPromise: Promise.resolve(),
    status,
    error,
    requestEvent,
    mode,
  }

  for (const preset of presets) {
    preset.setup?.(scriptLoadCtx)
  }

  async function transform(input: Head) {
    if(!input.script) return { script: [] }
    
    const script = input.script[0] as ScriptBase
    for (const preset of presets) {
      if (await preset.transform?.(script, scriptLoadCtx) === false) {
        return { script: [] }
      }
    }
    return { script: [script] }
  }

  // if (isSyncScript) {
  //   onMounted(() => {
  //     switch(status.value) {
  //       case 'loaded':
  //         typeof resolvedInput.onload === 'function' && resolvedInput.onload()
  //         break
  //       case 'error':
  //         typeof resolvedInput.onerror === 'function' && resolvedInput.onerror()
  //         break
  //     }
  //   })
  // }

  const head = injectHead()
  head.hooks.hook('dom:renderTag', (ctx) => {
    if (ctx.tag.key === key && ctx.tag.innerHTML) {
      // trigger the onload if the script is usign innerHTML
      status.value = 'loaded'
    }
  })

  scriptLoadCtx.loadPromise
    .then(() => {
      status.value = 'loading'
      if (process.server && mode === 'client')
        return
      if (process.client && mode === 'server')
        return
      head.push({ script: [input] }, { mode, transform: transform as (input: unknown) => unknown })
    })
    .catch(e => error.value = e)

  return { status, error, loaded: computed(() => status.value === 'loaded' )}
}
