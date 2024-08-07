<script lang="ts" setup>
import { useScriptNpm } from '#imports'

useScriptNpm({
  packageName: 'pannellum',
  file: 'build/pannellum.js',
  version: '2.5.6',
  scriptOptions: {
    bundle: true,
    use() {
      // @ts-expect-error un augmented
      return { pannellum: window.pannellum }
    },
  },
})
</script>

<template>
  <div>bundle test</div>
</template>
