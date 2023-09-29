<template>
  <div>
    <div ref="el"  />
  </div>
</template>

<script  setup lang="ts">
import { useCloudflareTurnstile, ref, onMounted, onBeforeUnmount } from "#imports"
const turnstile = useCloudflareTurnstile({ sitekey: '1x00000000000000000000AA' })
const el = ref<HTMLElement|null>(null)

onMounted(async () => {
    if (el.value) { 
      (await turnstile.$script.waitForLoad()).render(el.value)
    }
})

onBeforeUnmount(async () => {
  if (el.value) { 
       (await turnstile.$script.waitForLoad()).remove(el.value)
    }
})
</script>