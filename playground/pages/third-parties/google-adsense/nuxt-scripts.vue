<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  title: 'Google Adsense',
})
</script>

<template>
  <div>
    <ScriptGoogleAdsense
      data-ad-client="ca-pub-8232083562163020"
      data-ad-slot="6039709756"
    >
      <template #awaitingLoad>
      <div class="text-white text-3xl">...waiting</div>
      </template>
      <template #loading>
      <div class="text-white text-3xl">...loading</div>
      </template>
    </ScriptGoogleAdsense>
  </div>
</template>
