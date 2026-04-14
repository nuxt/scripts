<script lang="ts" setup>
import { useHead, useScriptHotjar } from '#imports'

useHead({
  title: 'Hotjar',
})

// composables return the underlying api as a proxy object and the script state
const { status, proxy } = useScriptHotjar({ id: 3925006, sv: 6 })

proxy.hj('identify', '123456', { test: 'foo' })
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>
