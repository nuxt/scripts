<script lang="ts" setup>
import { useHead } from '#imports'
import { VimeoEmbed } from '#components'

useHead({
  title: 'Vimeo component',
})

function handlePlay() {
  console.log('Playing')
}
</script>

<template>
  <VimeoEmbed video-id="76979871" width="640" height="400" :loop="true" @play="handlePlay" />
</template>