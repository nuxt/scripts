import { computed, ref, toValue, watch } from 'vue'
import type { Head, Script } from '@unhead/schema'
import type { ScriptBase } from 'zhead'
import { hashCode } from '@unhead/shared'
import type { UniversalScript, UseScriptOptions, UseScriptStatus } from '../types'
import { onNuxtReady, useInlineAsset, useNuxtApp, useProxyAsset } from '#imports'

export function useScript<T>(input: UseScriptOptions<T>): UniversalScript<T> {
  const nuxtApp = useNuxtApp()
  const resolvedScriptInput = toValue(input.script) || {} as Script
  const key = `nuxt-script-${hashCode(input.key)}`
  input.script.key = key
  if (nuxtApp.$nuxtScripts?.[key])
    return nuxtApp.$nuxtScripts[key]

  if (!nuxtApp.$nuxtScripts)
    nuxtApp.provide('nuxtScripts', {})
  // assign a key based on src

  // TODO handle modes

  async function transform(entry: Head) {
    let script = entry.script![0] as ScriptBase
    if (script.src) {
      if (input.assetStrategy === 'proxy')
        script.src = useProxyAsset(script.src)
      else if (input.assetStrategy === 'inline')
        // TODO handle errors and checksums
        script = await useInlineAsset(script.src) as ScriptBase
    }

    return { script: [script] }
  }

  const use = input.use as () => T

  const head = nuxtApp.vueApp._context.provides.usehead
  if (process.server) {
    // handle server side script, we don't need events or promises
    head.push({ script: [input.script] }, { ...input.scriptOptions, head, transform: transform as (input: unknown) => unknown })
    // TODO better handle mock scripts apis for server?
    return {
      use,
      status: ref('loaded'),
      error: ref(null),
      // return a promise that never resolves
      waitForLoad: () => new Promise(() => {}),
      loaded: computed(() => true),
    }
  }
  // we're client-side now

  // hydrating a ssr script has limited support for events, we need to trigger them a bit differently
  // TODO handle errors
  const isHydratingSSRScript = !!document.querySelector(`script[data-hid="${hashCode(key)}"]`)
  if (isHydratingSSRScript) {
    const status = ref<UseScriptStatus>('loading')
    const loadedPromise: Promise<T> = new Promise<T>((resolve, reject) => {
      // covers sync scripts and when events have already fired
      function doResolveTest() {
        const api = use()
        if (api)
          return resolve(api)
        return false
      }
      doResolveTest()
      // simple defer is easy
      if (resolvedScriptInput.defer && !resolvedScriptInput.async) {
        // if dom is already loaded and script use failed, we have an error
        if (document.readyState === 'complete')
          return reject(new Error('Script was not found'))
          // setup promise after DOMContentLoaded
        document.addEventListener('DOMContentLoaded', doResolveTest, { once: true })
      }
      // with async we need to wait for idle callbacks (onNuxtReady)
      else if (resolvedScriptInput.async) {
        // check if window is already loaded
        if (document.readyState === 'complete')
          return reject(new Error('Script was not found'))
          // on window load
        window.addEventListener('load', doResolveTest, { once: true })
      }
      else {
        onNuxtReady(() => {
          // idle timeout, must be loaded here
          if (!doResolveTest())
            reject(new Error('Script not found'))
        })
      }
    }).then(() => {
      status.value = 'loaded'
    })
    const script: UniversalScript<T> = {
      use,
      status,
      error: ref(null),
      waitForLoad: () => loadedPromise,
      loaded: computed(() => status.value === 'loaded'),
    }
    nuxtApp.$nuxtScripts[key] = script
    return script
  }

  // check if it already exists
  const error = ref<Error | null>(null)
  let startScriptLoadPromise = Promise.resolve()
  if (input.loadStrategy === 'idle')
    startScriptLoadPromise = new Promise(resolve => onNuxtReady(resolve))

  const status = ref<UseScriptStatus>('awaitingLoad')

  // need to stub out the onload function
  const onload = input.script.onload || (() => {})
  // when inserting client sided we can use the event handlers
  input.script.onload = () => {
    status.value = 'loaded'
    nuxtApp.runWithContext(onload)
  }

  // TODO handle sync script
  head.hooks.hook('dom:renderTag', (ctx) => {
    if (ctx.tag.key === key && ctx.tag.innerHTML) {
      // trigger the onload if the script is using innerHTML
      status.value = 'loaded'
    }
  })

  startScriptLoadPromise
    .then(() => {
      status.value = 'loading'
      head.push({ script: [input.script] }, { ...input.scriptOptions, head, transform: transform as (input: unknown) => unknown })
    })
    .catch(e => error.value = e)

  const waitForLoad = () => new Promise<T>((resolve) => {
    if (status.value === 'loaded')
      return resolve(use())
    // watch for status change
    const unregister = watch(status, () => {
      if (status.value === 'loaded') {
        unregister()
        resolve(use())
      }
    })
  })
  const script: UniversalScript<T> = {
    use,
    status,
    error,
    waitForLoad,
    loaded: computed(() => status.value === 'loaded'),
  }
  nuxtApp.$nuxtScripts[key] = script
  return script
}

declare module '#app' {
  interface NuxtApp {
    $nuxtScripts: Record<string, UniversalScript<any>>
  }
}