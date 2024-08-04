<script lang="ts" setup>
import { useScriptGoogleTagManager } from '#imports'

const { dataLayer, $script } = useScriptGoogleTagManager({
  id: 'G-TEST',
})

function pushEvent() {
  dataLayer.push({
    event: 'page_view',
    page_title: 'GTM',
  })
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ $script.status }}
      </div>
    </ClientOnly>

    <button @click="pushEvent">
      trigger
    </button>
  </div>
</template>
