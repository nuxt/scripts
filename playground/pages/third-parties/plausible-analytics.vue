<script lang="ts" setup>
import { ref, useHead, useScriptPlausibleAnalytics } from '#imports'

useHead({
  title: 'Plausible',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { $script, plausible } = useScriptPlausibleAnalytics({
  domain: 'scripts.nuxt.com',
  extension: 'local',
})
// this will be triggered once the script is ready async
plausible('404', { props: { path: '/404' } })

const clicks = ref(0)
async function clickHandler() {
  clicks.value++
  plausible('test', { props: { clicks: clicks.value } })
}
</script>

<template>
  <div>
    <UButton @click="clickHandler">
      important conversion {{ clicks }}
    </UButton>
    <ClientOnly>
      <div>
        status: {{ $script.status.value }}
      </div>
    </ClientOnly>
  </div>
</template>
