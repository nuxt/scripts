<script setup lang="ts">
import { callOnce, onMounted, ref, useElementScriptTrigger, useScriptGoogleAdsense } from '#imports'
import type { ElementScriptTrigger } from '#nuxt-scripts'

const props = withDefaults(defineProps<{
  dataAdClient: string
  dataAdSlot: string
  dataAdFormat?: 'auto'
  dataFullWidthResponsive?: boolean
  /**
   * Defines the trigger event to load the script.
   */
  trigger?: ElementScriptTrigger
}>(), {
  dataAdFormat: 'auto',
  dataFullWidthResponsive: true,
})

const rootEl = ref(null)
const trigger = useElementScriptTrigger({ trigger: props.trigger, el: rootEl })

const { $script } = useScriptGoogleAdsense({
  client: props.dataAdClient,
  scriptOptions: {
    trigger,
  },
})

onMounted(() => {
  callOnce(() => {
    (window.adsbygoogle = window.adsbygoogle || []).push({})
  })
})
</script>

<template>
  <ins
    ref="rootEl"
    class="adsbygoogle"
    style="display: block;"
    :data-ad-client="dataAdClient"
    :data-ad-slot="dataAdSlot"
    :data-ad-format="dataAdFormat"
    :data-full-width-responsive="dataFullWidthResponsive"
    v-bind="{ ...$attrs }"
  >
    <slot v-if="$script.status.value === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-if="$script.status.value === 'loading'" name="loading" />
  </ins>
</template>
