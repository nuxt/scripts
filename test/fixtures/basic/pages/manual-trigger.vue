<script lang="ts" setup>
import { useScript } from '#imports'

const { myScript, load } = useScript<{ myScript: (arg: string) => void }>('/myScript.js', {
  trigger: 'manual',
  use() {
    return {
      // @ts-expect-error untyped
      myScript: window.myScript,
    }
  },
})

myScript('test')

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
