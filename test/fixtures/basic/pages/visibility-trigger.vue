<script lang="ts" setup>
import { ref, useScriptTriggerElement, useScript } from '#imports'

const trigger = ref()
const { proxy } = useScript<{ myScript: (arg: string) => void }>('/myScript.js', {
  trigger: useScriptTriggerElement({
    trigger: 'visible',
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
    <div style="background-color: red; height: 150vh; width: 100%;" />
    <div id="el-trigger" ref="trigger">
      Load script when seen!
    </div>
  </div>
</template>
