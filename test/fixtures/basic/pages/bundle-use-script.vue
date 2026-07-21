<script lang="ts" setup>
import { ref, useScript } from '#imports'

const { id, onLoaded } = useScript<{ myScript: (arg: string) => void }>(
  // need a real script to bundle
  'https://code.jquery.com/jquery-3.6.0.min.js',
  {
    bundle: true,
    use() {
      return {
      // @ts-expect-error untyped
        myScript: window.myScript,
      }
    },
  },
)

const scriptSrc = ref('https://code.jquery.com/jquery-3.6.0.min.js')
onLoaded(() => {
  scriptSrc.value = id
})
</script>

<template>
  <div id="script-src">
    {{ scriptSrc }}
  </div>
</template>
