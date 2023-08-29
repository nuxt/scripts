<script lang="ts" setup>
import { useFathomAnalytics } from '#imports'

async function fathom() {
  const fathom = await useFathomAnalytics({
    site: '123',
  })
  console.log(fathom)
}
</script>

<template>
  <div>
    hello world
    <button @click="fathom">
      Use Fathom Analytics
    </button>
  </div>
</template>
