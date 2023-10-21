<script lang="ts" setup>
import { useGoogleTagManager } from '#imports'

// composables return the underlying api as a proxy object and a $script with the script state
const { $script } = useGoogleTagManager({
  id: 'GTM-MNJD4B',
})

// we can manually wait for the script to be ready (TODO error handling)
$script.waitForLoad().then(({ google_tag_manager, dataLayer}) => {
  console.log('google_tag_manager is ready', google_tag_manager)
  console.log('google_tag_manager is ready', window.google_tag_manager)

  console.log('dataLayer', dataLayer);
  console.log(google_tag_manager["GTM-MNJD4B"].dataLayer.reset);
  console.log(google_tag_manager.dataLayer.gtmDom);

  dataLayer.push({
    event: 'pageview',
    page_path: '/google-tag-manager',
  });
});
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        loaded: {{ $script.loaded }}
      </div>
    </ClientOnly>
  </div>
</template>
