<script lang="ts" setup>
import { useHead, useScriptGoogleTagManager } from '#imports'

useHead({
  title: 'Google Analytics',
})

// composables return the underlying api as a proxy object and the script state
const { dataLayer, then, status } = useScriptGoogleTagManager({
  id: 'GTM-MNJD4B',
  onBeforeGtmStart(gtag) {
    gtag('consent', 'default', {
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      ad_storage: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
    })
  },
}) // id is set via runtime config
dataLayer.push({
  event: 'page_view',
  page_title: 'Google Analytics',
  page_location: 'https://harlanzw.com/third-parties/google-analytics',
  page_path: '/third-parties/google-analytics',
})
then(({ google_tag_manager, dataLayer }) => {
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
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>
