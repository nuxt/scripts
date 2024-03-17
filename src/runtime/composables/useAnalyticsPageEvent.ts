import { injectHead, ref, useNuxtApp, useRoute } from '#imports'
import type { TrackedPage } from '#nuxt-scripts'

export function useAnalyticsPageEvent(onChange?: (payload: TrackedPage) => void) {
  const nuxt = useNuxtApp()
  const route = useRoute()
  const head = injectHead()
  const payload = ref<TrackedPage>({
    path: route.fullPath,
    title: typeof document !== 'undefined' ? document.title : '',
  })
  let lastPayload: TrackedPage = { path: '', title: '' }
  if (import.meta.server) {
    // we need to compute the title ahead of time
    return payload
  }
  let stopDomWatcher: () => void
  // TODO make sure useAsyncData isn't running
  nuxt.hooks.hook('page:finish', () => {
    Promise.race([
      // possibly no head update is needed
      new Promise(resolve => setTimeout(resolve, 100)),
      new Promise((resolve) => {
        stopDomWatcher = head.hooks.hook('dom:rendered', () => resolve())
      }),
    ]).finally(() => {
      stopDomWatcher && stopDomWatcher()
    }).then(() => {
      payload.value = {
        path: route.fullPath,
        title: document.title,
      }
      if (lastPayload.path !== payload.value.path || lastPayload.title !== payload.value.title) {
        onChange && onChange(payload.value)
        lastPayload = payload.value
      }
    })
  })
  return payload
}
