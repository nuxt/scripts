import { defineNuxtPlugin, useAnalyticsPageEvent, watch } from '#imports'
import { createScriptEventProxy } from '~/src/runtime/composables/createScriptEventProxy'

export default defineNuxtPlugin(() => {
  const track = createScriptEventProxy()
  const event = useAnalyticsPageEvent()
  watch(event, value => track('pageview', value), {
    immediate: true,
  })
})
