<script setup lang="ts">
import { computed, type HTMLAttributes, onMounted, ref, type ReservedProps, shallowRef, watch } from 'vue'
import { defu } from 'defu'
import type { PayPalMessagesComponent, PayPalMessagesComponentOptions } from '@paypal/paypal-js'
import { onBeforeUnmount, resolveComponent, useScriptPayPal, useScriptTriggerElement } from '#imports'
import type { ElementScriptTrigger } from '#nuxt-scripts/types'
import type { PayPalInput } from '../registry/paypal'

const el = ref<HTMLDivElement | null>(null)
const rootEl = ref<HTMLDivElement | null>(null)

const props = withDefaults(defineProps<{
  /**
   * Customize the root element attributes.
   */
  rootAttrs?: HTMLAttributes & ReservedProps & Record<string, unknown>
  /**
   * Defines the trigger event to load the script.
   */
  trigger?: ElementScriptTrigger
  /**
   * The client id for the paypal script.
   */
  clientId?: string
  /**
   * The options for the paypal buttons.
   */
  messagesOptions?: PayPalMessagesComponentOptions
  /**
   * The merchant id for the paypal script.
   */
  merchantId?: string
  /**
   * The partner attribution id for the paypal script.
   */
  partnerAttributionId?: string
  /**
   * The options for the paypal scipt.
   */
  paypalScriptOptions?: Partial<PayPalInput>
}>(), {
  trigger: 'visible',
  clientId: 'test',
  paypalScriptOptions: () => ({}),
  messagesOptions: () => ({}),
})

const ready = ref(false)

const { onLoaded, status } = useScriptPayPal({
  clientId: props.clientId,
  merchantId: props.merchantId,
  partnerAttributionId: props.partnerAttributionId,
  ...props.paypalScriptOptions,
})

const emit = defineEmits<{
  apply: [data: Record<string, unknown>]
  clickMessages: [data: Record<string, unknown>]
  render: [data: Record<string, unknown>]
}>()

const options = computed(() => {
  const _options: PayPalMessagesComponentOptions = {
    onApply: (data) => {
      emit('apply', data)
      return props.messagesOptions?.onApply?.(data)
    },
    onClick: (data) => {
      emit('clickMessages', data)
      return props.messagesOptions?.onClick?.(data)
    },
    onRender: (data) => {
      emit('render', data)
      return props.messagesOptions?.onRender?.(data)
    },
  }
  return defu(_options, props.messagesOptions)
})

const messageInst = shallowRef<PayPalMessagesComponent>()

onMounted(() => {
  onLoaded(async ({ paypal }) => {
    if (!el.value) return
    messageInst.value = paypal?.Messages?.(options.value)
    await messageInst.value?.render(el.value)
    ready.value = true

    watch(() => options.value, async (_options) => {
      if (!el.value) return
      // don't destroy the element
      messageInst.value = paypal?.Messages?.(_options)
      await messageInst.value?.render(el.value)
    })
  })
})

function destroy() {
  if (!el.value) return
  el.value?.replaceChildren()
}

onBeforeUnmount(() => {
  destroy()
})

const ScriptLoadingIndicator = resolveComponent('ScriptLoadingIndicator')

const trigger = useScriptTriggerElement({ trigger: props.trigger, el: rootEl })

const rootAttrs = computed(() => {
  return defu(props.rootAttrs, {
    'aria-busy': status.value === 'loading',
    'aria-label': status.value === 'awaitingLoad'
      ? 'PayPal Script Placeholder'
      : status.value === 'loading'
        ? 'PayPal Buttons Loading'
        : 'PayPal Buttons',
    'aria-live': 'polite',
    'role': 'application',
    ...(trigger instanceof Promise ? trigger.ssrAttrs || {} : {}),
  } satisfies HTMLAttributes)
})
</script>

<template>
  <div v-bind="rootAttrs" id="test">
    <div v-show="ready" ref="el" />
    <slot v-if="!ready" name="placeholder">
      placeholder
    </slot>
    <slot v-if="status !== 'awaitingLoad' && !ready" name="loading">
      <ScriptLoadingIndicator color="black" />
    </slot>
    <slot v-if="status === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="status === 'error'" name="error" />
    <slot />
  </div>
</template>
