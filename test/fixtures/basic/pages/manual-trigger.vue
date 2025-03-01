<script lang="ts" setup>
import { useScript } from '#imports'

const { proxy, load } = useScript<{ myScript: (arg: string) => void }>('/myScript.js', {
  trigger: 'manual',
  use() {
    return {
      // @ts-expect-error untyped
      myScript: window.myScript,
    }
  },
})

proxy.myScript('test')

function triggerLoad() {
  load()
}
</script>

<template>
  <div>
    <button id="load-script" type="button" @click="triggerLoad">
      Load Script
    </button>
  </div>
</template>
