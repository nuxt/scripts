<script lang="ts" setup>
import { useScriptGoogleTagManager } from '#imports'

const { status } = useScriptGoogleTagManager({
  id: 'GTM-5ZQZJZ',
  scriptOptions: {
    trigger: 'onNuxtReady', // this is the default behavior
    bundle: true,
  },
})
</script>

<template>
  <div>
    <div>
      {{ status }}
    </div>
  </div>
</template>
