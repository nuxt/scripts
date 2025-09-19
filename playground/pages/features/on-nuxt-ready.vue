<script lang="ts" setup>
import { useScriptGoogleTagManager } from '#imports'

const { status } = useScriptGoogleTagManager({
  id: 'GTM-MWW974PF',
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
