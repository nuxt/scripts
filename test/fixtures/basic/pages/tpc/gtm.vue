<script lang="ts" setup>
import { useScriptGoogleTagManager } from '#imports'

const { dataLayer, status } = useScriptGoogleTagManager({
  id: 'GTM-MNJD4B',
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
        status: {{ status }}
      </div>
    </ClientOnly>

    <button @click="pushEvent">
      trigger
    </button>
  </div>
</template>
