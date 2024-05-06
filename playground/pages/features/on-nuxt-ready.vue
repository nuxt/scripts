<script lang="ts" setup>
import { useScriptGoogleTagManager } from '#imports'

const { $script } = useScriptGoogleTagManager({
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
      {{ $script.status.value }}
    </div>
  </div>
</template>
