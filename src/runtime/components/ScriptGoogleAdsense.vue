<script setup lang="ts">
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { useScriptGoogleAdsense } from '../registry/google-adsense'
import { callOnce, computed, onMounted, ref, watch } from '#imports'
import type { ElementScriptTrigger } from '#nuxt-scripts/types'

const props = withDefaults(defineProps<{
  dataAdClient: string
  dataAdSlot: string
  dataAdFormat?: 'auto' | 'rectangle' | 'vertical' | 'horizontal' | 'fluid' | 'autorelaxed'
  dataAdLayout?: 'in-article' | 'in-feed' | 'fixed'
  dataFullWidthResponsive?: boolean
  /**
   * Defines the trigger event to load the script.
   */
  trigger?: ElementScriptTrigger
}>(), {
  dataFullWidthResponsive: true,
  dataAdFormat: 'auto', // Default to Auto Ads
})

const emits = defineEmits<{
  // our emit
  ready: [e: ReturnType<typeof useScriptGoogleAdsense>]
  error: []
}>()

const rootEl = ref(null)
const trigger = useScriptTriggerElement({ trigger: props.trigger, el: rootEl })

const instance = useScriptGoogleAdsense({
  client: props.dataAdClient,
  scriptOptions: {
    trigger,
  },
})

const { status } = instance

function pushAdSlot() {
  (window.adsbygoogle = window.adsbygoogle || []).push({})
}

onMounted(() => {
  if (import.meta.dev) {
    callOnce(() => pushAdSlot())
  }
  else {
    pushAdSlot()
  }

  watch(status, (val) => {
    if (val === 'loaded') {
      emits('ready', instance)
    }
    else if (val === 'error') {
      emits('error')
    }
  })
})

const rootAttrs = computed(() => {
  return {
    ...(trigger instanceof Promise ? trigger.ssrAttrs || {} : {}),
  }
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
    :data-ad-layout="dataAdLayout"
    :data-full-width-responsive="dataFullWidthResponsive"
    v-bind="rootAttrs"
  >
    <slot v-if="status === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="status === 'loading'" name="loading" />
    <slot v-else-if="status === 'error'" name="error" />
  </ins>
</template>
