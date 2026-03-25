<script setup lang="ts">
import type { ElementScriptTrigger } from '#nuxt-scripts/types'
import type {
  Components,
  CreateInstanceOptions,
  PageTypes,
  PayPalMessagesOptions,
  PayPalMessagesSession,
  PayPalV6Namespace,
  SdkInstance,
} from '@paypal/paypal-js/sdk-v6'
import type { HTMLAttributes, ReservedProps } from 'vue'
import type { PayPalInput } from '../registry/paypal'
import { defu } from 'defu'
import { computed, onBeforeUnmount, onMounted, ref, resolveComponent, shallowRef } from 'vue'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { useScriptPayPal } from '../registry/paypal'

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
   * Client ID or client token for PayPal SDK v6 authentication.
   */
  clientId?: string
  /**
   * Server-generated client token for SDK v6.
   */
  clientToken?: string
  /**
   * The merchant ID for the paypal script.
   */
  merchantId?: string | string[]
  /**
   * The partner attribution ID.
   */
  partnerAttributionId?: string
  /**
   * The page type context hint.
   */
  pageType?: PageTypes
  /**
   * The locale for the SDK (BCP-47 code).
   */
  locale?: string
  /**
   * Options for the PayPal Messages session.
   */
  messagesOptions?: PayPalMessagesOptions
  /**
   * The paypal script options.
   */
  paypalScriptOptions?: Partial<PayPalInput>
}>(), {
  trigger: 'visible',
  clientId: 'test',
  paypalScriptOptions: () => ({}),
  messagesOptions: () => ({}),
})

const emit = defineEmits<{
  ready: [session: PayPalMessagesSession]
  error: [error: unknown]
}>()

const el = ref<HTMLDivElement | null>(null)
const rootEl = ref<HTMLDivElement | null>(null)
const ready = ref(false)
const failed = ref(false)
const messagesSession = shallowRef<PayPalMessagesSession>()

const { onLoaded, status } = useScriptPayPal({
  ...(props.clientToken ? { clientToken: props.clientToken } : { clientId: props.clientId }),
  ...props.paypalScriptOptions,
})

onMounted(() => {
  onLoaded(async ({ paypal }: { paypal: PayPalV6Namespace }) => {
    if (!el.value)
      return

    const components: Components[] = ['paypal-messages']
    const instanceOptions = {
      ...(props.clientToken
        ? { clientToken: props.clientToken }
        : { clientId: props.clientId }),
      components,
      ...(props.pageType && { pageType: props.pageType }),
      ...(props.locale && { locale: props.locale }),
      ...(props.merchantId && { merchantId: props.merchantId }),
      ...(props.partnerAttributionId && { partnerAttributionId: props.partnerAttributionId }),
    } as CreateInstanceOptions<['paypal-messages']>

    try {
      const instance = await paypal.createInstance(instanceOptions) as SdkInstance<['paypal-messages']>
      messagesSession.value = instance.createPayPalMessages(props.messagesOptions)
      ready.value = true
      emit('ready', messagesSession.value)
    }
    catch (err) {
      messagesSession.value = undefined
      failed.value = true
      emit('error', err)
    }
  })
})

onBeforeUnmount(() => {
  messagesSession.value = undefined
})

defineExpose({
  messagesSession,
})

const ScriptLoadingIndicator = resolveComponent('ScriptLoadingIndicator')

const trigger = useScriptTriggerElement({ trigger: props.trigger, el: rootEl })

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
  <div ref="rootEl" v-bind="rootAttrs">
    <div ref="el">
      <slot v-if="ready" name="default" :messages-session="messagesSession" />
    </div>
    <slot v-if="status !== 'error' && !ready && !failed" name="placeholder">
      placeholder
    </slot>
    <slot v-if="status !== 'awaitingLoad' && status !== 'error' && !ready && !failed" name="loading">
      <ScriptLoadingIndicator color="black" />
    </slot>
    <slot v-if="status === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="status === 'error' || failed" name="error" />
  </div>
</template>
