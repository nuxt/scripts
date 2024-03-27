<script lang="ts" setup>
import { useScript } from '#imports'

const { $script } = useScript('https://www.googletagmanager.com/gtag/js?id=GTM-5ZQZJZ', {
  trigger: 'onNuxtReady',
  assetStrategy: 'bundle',
})
</script>

<template>
  <div>
    <div>
      {{ $script.status }}
    </div>
  </div>
</template>
