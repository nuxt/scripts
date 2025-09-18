<script setup lang="ts">
import { computed, type HTMLAttributes, onMounted, ref, type ReservedProps, shallowRef, watch } from 'vue'
import { defu } from 'defu'
import type { PayPalMarksComponent, PayPalMarksComponentOptions } from '@paypal/paypal-js'
import { onBeforeUnmount, type PayPalInput, resolveComponent, useScriptPayPal, useScriptTriggerElement } from '#imports'
import type { ElementScriptTrigger } from '#nuxt-scripts'

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
   * The options for the paypal marks.
   */
  marksOptions?: PayPalMarksComponentOptions
  /**
   * The paypal script options.
   */
  paypalScriptOptions?: Partial<PayPalInput>
}>(), {
  trigger: 'visible',
  clientId: 'test',
  marksOptions: () => ({}),
  paypalScriptOptions: () => ({}),
})

const ready = ref(false)

const { onLoaded, status } = useScriptPayPal({
  clientId: props.clientId,
  ...props.paypalScriptOptions,
})

const marksInst = shallowRef<PayPalMarksComponent>()

onMounted(() => {
  onLoaded(async ({ paypal }) => {
    if (!el.value) return
    marksInst.value = paypal?.Marks?.(props.marksOptions)
    await marksInst.value?.render(el.value)
    ready.value = true

    watch(() => props.marksOptions, async (_options) => {
      if (!el.value) return
      destroy()
      marksInst.value = paypal?.Marks?.(_options)
      await marksInst.value?.render(el.value)
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
        ? 'PayPal Marks Loading'
        : 'PayPal Marks',
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
