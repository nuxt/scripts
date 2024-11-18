<script setup lang="ts">
import { computed, type HTMLAttributes, onMounted, ref, type ReservedProps, shallowRef, watch } from 'vue'
import { defu } from 'defu'
import type {
  OnApproveActions,
  OnApproveData,
  OnCancelledActions,
  OnClickActions,
  OnShippingAddressChangeActions,
  OnShippingAddressChangeData,
  OnShippingOptionsChangeActions,
  OnShippingOptionsChangeData,
  PayPalButtonsComponent,
  PayPalButtonsComponentOptions,
} from '@paypal/paypal-js'
import type { OnInitActions } from '@paypal/paypal-js/types/components/buttons'
import { onBeforeUnmount, type PaypalInput, resolveComponent, useScriptPaypal, useScriptTriggerElement } from '#imports'
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
   * The options for the paypal buttons.
   */
  buttonOptions?: PayPalButtonsComponentOptions
  /**
   * The paypal script options.
   */
  paypalScriptOptions?: Partial<PaypalInput>
  /**
   * Disables the paypal buttons.
   */
  disabled?: boolean
}>(), {
  trigger: 'visible',
  clientId: 'test',
  disabled: false,
  buttonOptions: () => ({}),
  paypalScriptOptions: () => ({}),
})

const ready = ref(false)

const { onLoaded, status } = useScriptPaypal({
  clientId: props.clientId,
  ...props.paypalScriptOptions,
})

const emit = defineEmits<{
  approve: [data: OnApproveData, actions: OnApproveActions]
  error: [error: Record<string, unknown>]
  cancel: [data: Record<string, unknown>, actions: OnCancelledActions]
  clickButtons: [data: Record<string, unknown>, actions: OnClickActions]
  shippingOptionsChange: [
    data: OnShippingOptionsChangeData,
    actions: OnShippingOptionsChangeActions,
  ]
  shippingAddressChange: [
    data: OnShippingAddressChangeData,
    actions: OnShippingAddressChangeActions,
  ]
  init: [data: Record<string, unknown>, actions: OnInitActions]
}>()

const initActions = shallowRef<OnInitActions | null>(null)

const handleDisabled = () => {
  if (!initActions.value) return
  if (props.disabled) {
    initActions.value.disable()
  }
  else {
    initActions.value.enable()
  }
}

const options = computed(() => {
  const _options: PayPalButtonsComponentOptions = {
    onApprove: async (data, actions) => {
      emit('approve', data, actions)
      return props.buttonOptions?.onApprove?.(data, actions)
    },
    onError: (err) => {
      emit('error', err)
      return props.buttonOptions?.onError?.(err)
    },
    onCancel: (data, actions) => {
      emit('cancel', data, actions)
      return props.buttonOptions?.onCancel?.(data, actions)
    },
    onClick: (data, actions) => {
      emit('clickButtons', data, actions)
      return props.buttonOptions?.onClick?.(data, actions)
    },
    onShippingOptionsChange: async (data, actions) => {
      emit('shippingOptionsChange', data, actions)
      return props.buttonOptions?.onShippingOptionsChange?.(data, actions)
    },
    onShippingAddressChange: async (data, actions) => {
      emit('shippingAddressChange', data, actions)
      return props.buttonOptions?.onShippingAddressChange?.(data, actions)
    },
    onInit: (data, actions) => {
      initActions.value = actions
      actions.disable()
      handleDisabled()
      emit('init', data, actions)
      return props.buttonOptions?.onInit?.(data, actions)
    },
  }
  return defu(_options, props.buttonOptions)
})

watch(() => props.disabled, handleDisabled)

const buttonInst = shallowRef<PayPalButtonsComponent>()

onMounted(() => {
  onLoaded(async ({ paypal }) => {
    if (!el.value) return
    buttonInst.value = paypal?.Buttons?.(options.value)
    await buttonInst.value?.render(el.value)
    ready.value = true

    watch(() => options.value, async (_options) => {
      if (!el.value) return
      await buttonInst.value?.updateProps(_options)
    })
  })
})

async function destroy() {
  if (buttonInst.value) {
    await buttonInst.value?.close()
  }
}

onBeforeUnmount(async () => {
  await destroy()
})

const ScriptLoadingIndicator = resolveComponent('ScriptLoadingIndicator')

const trigger = useScriptTriggerElement({ trigger: props.trigger, el: rootEl })

const rootAttrs = computed(() => {
  return defu(props.rootAttrs, {
    'aria-busy': status.value === 'loading',
    'aria-label': status.value === 'awaitingLoad'
      ? 'Paypal Script Placeholder'
      : status.value === 'loading'
        ? 'Paypal Buttons Loading'
        : 'Paypal Buttons',
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
