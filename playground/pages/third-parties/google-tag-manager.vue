<script lang="ts" setup>
import { useHead, useScriptGoogleTagManager } from '#imports'

useHead({
  title: 'Google Analytics',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { dataLayer, $script } = useScriptGoogleTagManager({
  id: 'GTM-MNJD4B',
}) // id is set via runtime config
console.log($script.status, dataLayer, typeof dataLayer)
console.log(dataLayer)
// disabled for test purposes, also because there's an issue https://github.com/nuxt/scripts/issues/77

// dataLayer.push({
//   event: 'page_view',
//   page_title: 'Google Analytics',
//   page_location: 'https://harlanzw.com/third-parties/google-analytics',
//   page_path: '/third-parties/google-analytics',
// })
$script.then(({ google_tag_manager, dataLayer }) => {
  // eslint-disable-next-line no-console
  console.log('google_tag_manager is ready', google_tag_manager)
  // eslint-disable-next-line no-console
  console.log('google_tag_manager is ready', window.google_tag_manager)

  // eslint-disable-next-line no-console
  console.log('dataLayer', dataLayer)
  // eslint-disable-next-line no-console
  console.log(google_tag_manager['GTM-MNJD4B'].dataLayer.reset)
  // eslint-disable-next-line no-console
  console.log(google_tag_manager.dataLayer.gtmDom)

  dataLayer.push({
    event: 'pageview',
    page_path: '/google-tag-manager',
  })
})
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ $script.status }}
      </div>
    </ClientOnly>
  </div>
</template>
