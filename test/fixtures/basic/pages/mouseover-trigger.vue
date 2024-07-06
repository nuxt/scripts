<script lang="ts" setup>
import { ref, useScriptTriggerElement, useScript } from '#imports'

const trigger = ref()
const { myScript, $script } = useScript<{ myScript: (arg: string) => void }>('/myScript.js', {
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

myScript('test')
</script>

<template>
  <div>
    <div id="el-trigger" ref="trigger">
      Load script when seen!
    </div>
    <div>
      {{ $script.status }}
    </div>
  </div>
</template>
