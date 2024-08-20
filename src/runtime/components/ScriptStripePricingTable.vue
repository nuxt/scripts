<script setup lang="ts">
import { ref } from 'vue'
import type { ElementScriptTrigger } from '../types'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { useScript } from '../composables/useScript'
import { onBeforeUnmount, onMounted, watch } from '#imports'

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
const instance = useScript(`https://js.stripe.com/v3/pricing-table.js`, {
  trigger: useScriptTriggerElement({ trigger: props.trigger, el: rootEl }),
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
</script>

<template>
  <div ref="rootEl">
    <div ref="containerEl" />
    <slot v-if="status === 'loading'" name="loading" />
    <slot v-if="status === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="status === 'error'" name="error" />
    <slot />
  </div>
</template>
