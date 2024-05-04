<script lang="ts" setup>
import { onMounted, useHead } from '#imports'

useHead({
  title: 'Google Analytics',
  script: [
    {
      async: true,
      src: 'https://www.googletagmanager.com/gtag/js?id=G-TR58L0EF8P',
    },
    {
      innerHTML: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-TR58L0EF8P');
      `,
    },
  ],
})

onMounted(() => {
  setTimeout(() => {
    window.gtag('event', 'page_view', {
      page_title: 'Google Analytics',
      page_location: 'https://harlanzw.com/third-parties/google-analytics',
      page_path: '/third-parties/google-analytics',
    })
  }, 1000)
})

function triggerConversion() {
  window.gtag('event', 'conversion')
}
</script>

<template>
  <div>
    <button @click="triggerConversion">
      Trigger Conversion
    </button>
  </div>
</template>
