<script setup lang="ts">
import { computed, type HTMLAttributes, onMounted, ref, type ReservedProps, shallowRef, watch, onBeforeUnmount } from 'vue'
import { defu } from 'defu'
import type { PayPalMessagesComponent, PayPalMessagesComponentOptions } from '@paypal/paypal-js'
import type { ElementScriptTrigger } from '#nuxt-scripts/types'
import { type PayPalInput, useScriptPayPal } from '../registry/paypal'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'

const el = ref<HTMLDivElement | null>(null)
const rootEl = ref<HTMLDivElement | null>(null)

const props = withDefaults(defineProps<{
  /**
   * Customize the root element attributes.
   */
  rootAttrs?: HTMLAttributes & ReservedProps & Record<string, unknown>
  /**
   * Defines the trigger event to load the script.
   *
   * @default 'visible'
   */
  trigger?: ElementScriptTrigger
  /**
   * The client id for the paypal script.
   *
   * @default 'test'
   */
  clientId?: string
  /**
   * The options for the paypal messages.
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
   * The options for the paypal script.
   */
  payPalScriptOptions?: Partial<PayPalInput>
}>(), {
  trigger: 'visible',
  clientId: 'test',
  payPalScriptOptions: () => ({}),
  messagesOptions: () => ({}),
})

const ready = ref(false)

const instance = useScriptPayPal({
  clientId: props.clientId,
  merchantId: props.merchantId,
  partnerAttributionId: props.partnerAttributionId,
  ...props.payPalScriptOptions,
})
const { onLoaded, status } = instance

const emit = defineEmits<{
  ready: [ReturnType<typeof useScriptPayPal>]
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
    emit('ready', instance)

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

const trigger = useScriptTriggerElement({ trigger: props.trigger, el: rootEl })

defineExpose({
  instance,
})

const rootAttrs = computed(() => {
  return defu(props.rootAttrs, {
    'aria-busy': status.value === 'loading',
    'aria-label': status.value === 'awaitingLoad'
      ? 'PayPal Script Placeholder'
      : status.value === 'loading'
        ? 'PayPal Messages Loading'
        : 'PayPal Messages',
    'aria-live': 'polite',
    'role': 'application',
    ...(trigger instanceof Promise ? trigger.ssrAttrs || {} : {}),
  } satisfies HTMLAttributes)
})
</script>

<template>
  <div v-bind="rootAttrs">
    <div v-show="ready" ref="el" />
    <slot v-if="status === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="status === 'loading'" name="loading" />
    <slot v-else-if="status === 'error'" name="error" />
  </div>
</template>
