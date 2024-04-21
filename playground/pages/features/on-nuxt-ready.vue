<script lang="ts" setup>
import { useScriptGoogleTagManager } from '../../../src/runtime/registry/google-tag-manager'

const { $script } = useScriptGoogleTagManager({
  id: 'GTM-5ZQZJZ',
  scriptOptions: {
    trigger: 'onNuxtReady', // this is the default behavior
    assetStrategy: 'bundle',
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
