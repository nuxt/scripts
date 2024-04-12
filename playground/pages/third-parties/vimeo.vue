<script lang="ts" setup>
import { onMounted, useHead, useScriptVimeo } from '#imports'

useHead({
  title: 'Vimeo',
})

onMounted(() => {
  const { Player } = useScriptVimeo()
  Player('player', {
    id: 76979871,
    width: 400,
    height: 400,
  })
})
</script>

<template>
  <div id="player" />
</template>
