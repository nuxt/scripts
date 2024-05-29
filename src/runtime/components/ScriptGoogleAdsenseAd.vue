<script setup lang="ts">
import { callOnce, onMounted, useScriptGoogleAdsense } from '#imports'

const props = withDefaults(defineProps<{
  dataAdClient: string
  dataAdSlot: string
  dataAdFormat?: 'auto'
  dataFullWidthResponsive?: boolean
}>(), {
  dataAdFormat: 'auto',
  dataFullWidthResponsive: true,
})

useScriptGoogleAdsense({ client: props.dataAdClient })

onMounted(() => {
  callOnce(() => {
    (window.adsbygoogle = window.adsbygoogle || []).push({})
  })
})
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        <ins
          class="adsbygoogle"
          style="display:block"
          :data-ad-client="dataAdClient"
          :data-ad-slot="dataAdSlot"
          :data-ad-format="dataAdFormat"
          :data-full-width-responsive="dataFullWidthResponsive"
          v-bind="{ ...$attrs }"
        />
      </div>
    </ClientOnly>
  </div>
</template>
