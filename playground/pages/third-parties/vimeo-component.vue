<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  title: 'Vimeo component',
})

function handlePlay() {
  // eslint-disable-next-line no-console
  console.log('Playing')
}
</script>

<template>
  <VimeoEmbed video-id="76979871" width="640" height="400" :loop="true" @play="handlePlay" />
</template>
