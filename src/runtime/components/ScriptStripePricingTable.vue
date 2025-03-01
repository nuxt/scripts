<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import type { ElementScriptTrigger } from '../types'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { useScript } from '#imports'

const props = withDefaults(defineProps<{
  trigger?: ElementScriptTrigger
  publishableKey: string
  pricingTableId: string
  clientReferenceId?: string
  customerEmail?: string
  customerSessionClientSecret?: string
}>(), {
  trigger: 'visible',
})

const emit = defineEmits<{
  ready: [ReturnType<typeof useScript>]
  error: []
}>()

const rootEl = ref<HTMLDivElement | undefined>()
const containerEl = ref<HTMLDivElement | undefined>()
const trigger = useScriptTriggerElement({ trigger: props.trigger, el: rootEl })
const instance = useScript(`https://js.stripe.com/v3/pricing-table.js`, {
  trigger,
})
const { onLoaded, status } = instance

const pricingTable = ref<HTMLElement | undefined>()
onMounted(() => {
  onLoaded(() => {
    const StripePricingTable = window.customElements.get('stripe-pricing-table')!
    const stripePricingTable = new StripePricingTable()
    stripePricingTable.setAttribute('publishable-key', props.publishableKey)
    stripePricingTable.setAttribute('pricing-table-id', props.pricingTableId)
    if (props.clientReferenceId)
      stripePricingTable.setAttribute('client-reference-id', props.clientReferenceId)
    if (props.customerEmail)
      stripePricingTable.setAttribute('customer-email', props.customerEmail)
    if (props.customerSessionClientSecret)
      stripePricingTable.setAttribute('customer-session-client-secret', props.customerSessionClientSecret)
    pricingTable.value = stripePricingTable
    rootEl.value!.appendChild(stripePricingTable)
    emit('ready', instance)
  })
  watch(status, (status) => {
    if (status === 'error') {
      emit('error')
    }
  })
})

onBeforeUnmount(() => {
  pricingTable.value?.remove()
})

const rootAttrs = computed(() => {
  return {
    ...(trigger instanceof Promise ? trigger.ssrAttrs || {} : {}),
  }
})
</script>

<template>
  <div ref="rootEl" v-bind="rootAttrs">
    <div ref="containerEl" />
    <slot v-if="status === 'loading'" name="loading" />
    <slot v-if="status === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="status === 'error'" name="error" />
    <slot />
  </div>
</template>
