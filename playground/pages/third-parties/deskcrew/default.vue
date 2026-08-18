<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  script: [
    {
      'src': 'https://deskcrew.io/desk.js',
      'data-key': 'pub_deskcrewdemo',
      'data-board': 'demo',
    },
  ],
})
</script>

<template>
  <div>
    deskcrew
  </div>
</template>
