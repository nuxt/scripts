<script lang="ts" setup>
import { onMounted, ref, useHead } from '#imports'

useHead({
  title: 'Google Adsense',
})

useHead({
  script: [
    {
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
      async: true,
      crossorigin: 'anonymous',
    },
  ],
})
const loaded = ref(false)
onMounted(() => {
  setTimeout(() => {
    loaded.value = true
    ;(window.adsbygoogle = window.adsbygoogle || []).push({})
  }, 1000)
})
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        <ins
          class="adsbygoogle"
          style="display:block"
          data-ad-client="ca-pub-8232083562163020"
          data-ad-slot="6039709756"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </ClientOnly>
  </div>
</template>
