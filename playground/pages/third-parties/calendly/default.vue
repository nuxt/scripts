<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  title: 'Calendly (Default)',
  link: [
    { rel: 'stylesheet', href: 'https://assets.calendly.com/assets/external/widget.css' },
  ],
  script: [
    { src: 'https://assets.calendly.com/assets/external/widget.js', async: true },
  ],
})

function openPopup() {
  ;(window as any).Calendly?.initPopupWidget({ url: 'https://calendly.com/d/cmpd-djc-mng/test-event' })
}
</script>

<template>
  <div>
    <UButton @click="openPopup">
      Open popup
    </UButton>
    <div
      class="calendly-inline-widget mt-4"
      data-url="https://calendly.com/d/cmpd-djc-mng/test-event"
      style="min-width: 320px; height: 700px"
    />
  </div>
</template>
