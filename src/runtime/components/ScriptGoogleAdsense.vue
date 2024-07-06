<script setup lang="ts">
import { useElementScriptTrigger } from '../composables/useElementScriptTrigger'
import { useScriptGoogleAdsense } from '../registry/google-adsense'
import { callOnce, onMounted, ref, watch } from '#imports'
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

const emits = defineEmits<{
  // our emit
  ready: [e: ReturnType<typeof useScriptGoogleAdsense>]
  error: []
}>()

const rootEl = ref(null)
const trigger = useElementScriptTrigger({ trigger: props.trigger, el: rootEl })

const instance = useScriptGoogleAdsense({
  client: props.dataAdClient,
  scriptOptions: {
    trigger,
  },
})

const { $script } = instance

onMounted(() => {
  callOnce(() => {
    (window.adsbygoogle = window.adsbygoogle || []).push({})
  })
  watch(instance.$script.status, () => {
    if (instance.$script.status.value === 'loaded') {
      emits('ready', instance)
    }
    else if (instance.$script.status.value === 'error') {
      emits('error')
    }
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
    <slot v-else-if="$script.status.value === 'loading'" name="loading" />
    <slot v-else-if="$script.status.value === 'error'" name="error" />
  </ins>
</template>
