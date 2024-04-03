<script lang="ts" setup>
import { useHead } from '#imports'
import { Vimeo } from '#components'

useHead({
  title: 'Vimeo component',
})

function handlePlay() {
  console.log('Playing')
}
</script>

<template>
  <Vimeo id="76979871" width="640" height="400" :loop="true" @play="handlePlay" />
</template>