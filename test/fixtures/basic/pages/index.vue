<script lang="ts" setup>
import { onNuxtReady, useScript } from '#imports'

const { proxy } = useScript<{ myScript: (arg: string) => void }>('/myScript.js', {
  trigger: onNuxtReady,
  use() {
    return {
      // @ts-expect-error untyped
      myScript: window.myScript,
    }
  },
})

proxy.myScript('test')
</script>

<template>
  <div>hello world</div>
</template>
