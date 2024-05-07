<script setup>
import { useHead } from '#imports'

useHead({
  script: [
    {
      'src': 'https://static.cloudflareinsights.com/beacon.min.js',
      'defer': true,
      'data-cf-beacon': JSON.stringify({
        token: 'ade278253a19413c9bd923b079870902',
      }),
    },
  ],
})
</script>

<template>
  <div>useHead</div>
</template>
