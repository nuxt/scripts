<script lang="ts" setup>
import { useHead, useScriptGoogleAnalytics } from '#imports'
import {useScriptGoogleTagManager} from "../../../src/runtime/registry/google-tag-manager";

useHead({
  title: 'Google Analytics',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { datalayer } = useScriptGoogleTagManager({ id: 'KBXOGxgqMFjm2mxtJDJg0iDn5AnGYb9C' })
// TODO This should just work
datalayer.push({
  event: 'page_view',
  page_title: 'Google Analytics',
  page_location: 'https://harlanzw.com/third-parties/google-analytics',
  page_path: '/third-parties/google-analytics',
})
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ $script.status.value }}
      </div>
    </ClientOnly>
  </div>
</template>
