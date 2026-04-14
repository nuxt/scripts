<script lang="ts" setup>
import { useScript } from '#imports'
import { ref } from 'vue'

const loadCount = ref(0)
const useCallCount = ref(0)

const { reload, status } = useScript<{ myScript: (arg: string) => void }>('/myScript.js', {
  use() {
    useCallCount.value++
    return {
      // @ts-expect-error untyped
      myScript: window.myScript,
    }
  },
  beforeInit() {
    loadCount.value++
  },
})

async function triggerReload() {
  await reload()
}
</script>

<template>
  <div>
    <div id="status">
      {{ status }}
    </div>
    <div id="load-count">
      {{ loadCount }}
    </div>
    <div id="use-call-count">
      {{ useCallCount }}
    </div>
    <button id="reload-script" type="button" @click="triggerReload">
      Reload Script
    </button>
  </div>
</template>
