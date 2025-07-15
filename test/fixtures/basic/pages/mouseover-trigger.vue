<script lang="ts" setup>
import { ref, useScriptTriggerElement, useScript } from '#imports'

const trigger = ref()
const { proxy, status } = useScript<{ myScript: (arg: string) => void }>('/myScript.js', {
  trigger: useScriptTriggerElement({
    trigger: 'mouseover',
    el: trigger,
  }),
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
  <div>
    <div id="el-trigger" ref="trigger">
      Load script when seen!
    </div>
    <div>
      {{ status }}
    </div>
  </div>
</template>
