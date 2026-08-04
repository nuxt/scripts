import type { TrackedPage } from '#nuxt-scripts/types'
import { injectHead, useNuxtApp, useRoute } from 'nuxt/app'
import { onScopeDispose, ref } from 'vue'

export function useScriptEventPage(onChange?: (payload: TrackedPage) => void) {
  const nuxt = useNuxtApp()
  const route = useRoute()
  const head = injectHead()
  const payload = ref<TrackedPage>({
    path: route.fullPath,
    title: import.meta.client ? document.title : '',
  })
  // no know to know the title on the server until the page is rendered
  if (import.meta.server)
    return payload

  let lastPayload: TrackedPage = { path: '', title: '' }
  let disposed = false
  const pendingCleanups = new Set<() => void>()
  // TODO make sure useAsyncData isn't running
  const stopPageFinishHook = nuxt.hooks.hook('page:finish', () => {
    let settled = false
    let stopDomWatcher = () => {}
    const timer = setTimeout(finish, 100)

    function cleanup() {
      clearTimeout(timer)
      stopDomWatcher()
      pendingCleanups.delete(cleanup)
    }

    function finish() {
      if (settled)
        return
      settled = true
      cleanup()
      queueMicrotask(() => {
        if (disposed)
          return
        payload.value = {
          path: route.fullPath,
          title: document.title,
        }
        if (lastPayload.path !== payload.value.path || lastPayload.title !== payload.value.title) {
          if (onChange) {
            onChange(payload.value)
          }
          lastPayload = payload.value
        }
      })
    }

    pendingCleanups.add(cleanup)
    stopDomWatcher = head.hooks!.hook('dom:rendered', finish)
  })

  onScopeDispose(() => {
    disposed = true
    for (const cleanup of pendingCleanups)
      cleanup()
    pendingCleanups.clear()
    stopPageFinishHook()
  })

  return payload
}
