<script lang="ts" setup>
import { useScript } from '#imports'

const { $script } = useScript('/test.js')

await $script
</script>

<template>
  <div>hello world</div>
</template>
