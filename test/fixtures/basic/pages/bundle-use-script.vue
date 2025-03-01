<script lang="ts" setup>
import { injectHead, ref, useScript } from '#imports'

const { proxy, onLoaded } = useScript<{ myScript: (arg: string) => void }>(
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
onLoaded(async () => {
  const head = injectHead()
  const tags = await head.resolveTags()
  scriptSrc.value = tags.filter(s => s.tag === 'script')[0].props.src
})

proxy.myScript('test')
</script>

<template>
  <div id="script-src">
    {{ scriptSrc }}
  </div>
</template>
