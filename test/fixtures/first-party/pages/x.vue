<script lang="ts" setup>
import { useHead, useScriptXPixel } from '#imports'

useHead({
  title: 'X Pixel - First Party',
})

const { status } = useScriptXPixel({
  id: 'ol7lz',
})
</script>

<template>
  <div>
    <h1>X Pixel First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>
