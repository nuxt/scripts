import { computed, ref, toValue, watch } from 'vue'
import type { Head, RuntimeMode } from '@unhead/schema'
import type { ScriptBase } from 'zhead'
import { hash } from 'ohash'
import type { UseScriptInput, UseScriptReturn, UseScriptStatus } from '../types'
import { ProxySrc } from '../transforms/proxy'
import { InlineSrc } from '../transforms/inline'
import { LoadIdle } from '../transforms/idle'
import { injectHead, useNuxtApp, useRequestEvent } from '#imports'

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

export function useScript(input: UseScriptInput): UseScriptReturn {
  const error = ref<Error | null>(null)

  const resolvedInput = toValue(input)

  const transforms = resolvedInput.transforms || []
  delete input.transforms
  if (input.assetStrategy === 'proxy')
    transforms.push(ProxySrc())
  else if (input.assetStrategy === 'inline')
    transforms.push(InlineSrc())
  if (input.loadStrategy === 'idle')
    transforms.push(LoadIdle())

  const status = ref<UseScriptStatus>('awaitingLoad')

  // assign a key based on src
  const key = input.key || `nuxt-script-${hash(resolvedInput.src || resolvedInput.innerHTML)}`
  if (input.mode !== 'server')
    input.key = key

  const nuxtApp = useNuxtApp()
  // need to stub out the onload function
  const onload = input.onload || (() => {})
  input.onload = () => {
    status.value = 'loaded'
    nuxtApp.runWithContext(onload)
  }

  const mode: RuntimeMode = input.mode || 'all'
  if (input.mode)
    delete input.mode

  const requestEvent = process.server ? useRequestEvent() : null

  const scriptLoadCtx = {
    startScriptLoadPromise: Promise.resolve(),
    scriptLoadedPromise: Promise.resolve(),
    status,
    error,
    requestEvent,
    mode,
  }

  for (const preset of transforms)
    preset.setup?.(scriptLoadCtx)

  async function transform(input: Head) {
    if (!input.script)
      return { script: [] }

    const script = input.script[0] as ScriptBase
    for (const preset of transforms) {
      if (await preset.transform?.(script, scriptLoadCtx) === false)
        return { script: [] }
    }
    return { script: [script] }
  }

  // TODO handle sync script

  const head = injectHead()
  head.hooks.hook('dom:renderTag', (ctx) => {
    if (ctx.tag.key === key && ctx.tag.innerHTML) {
      // trigger the onload if the script is using innerHTML
      status.value = 'loaded'
    }
  })

  scriptLoadCtx.startScriptLoadPromise
    .then(() => {
      status.value = 'loading'
      if (process.server && mode === 'client')
        return
      if (process.client && mode === 'server')
        return
      head.push({ script: [input] }, { mode, transform: transform as (input: unknown) => unknown })
    })
    .catch(e => error.value = e)

  const waitForLoad = async () => status.value === 'loaded'
    ? Promise.resolve()
    : await new Promise<void>((resolve) => {
      watch(status, () => {
        if (status.value === 'loaded')
          resolve()
      })
    })

  return { status, error, waitForLoad, loaded: computed(() => status.value === 'loaded') }
}
