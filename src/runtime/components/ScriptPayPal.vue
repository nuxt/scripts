<script setup lang="ts">
// TODO: just testing. Components might be ScriptPaypalButtons, ScriptPaypalMessages,...
import { computed, type HTMLAttributes, onMounted, ref, type ReservedProps, watch } from 'vue'
import { defu } from 'defu'
import { resolveComponent, useScriptPaypal, useScriptTriggerElement } from '#imports'
import type { ElementScriptTrigger } from '#nuxt-scripts'

const el = ref<HTMLDivElement | null>(null)
const rootEl = ref<HTMLDivElement | null>(null)

const props = withDefaults(defineProps<{
  /**
   * Customize the root element attributes.
   */
  rootAttrs?: HTMLAttributes & ReservedProps & Record<string, unknown>
  /**
   * Defines the width of the map.
   */
  width?: number | string
  /**
   * Defines the height of the map
   */
  height?: number | string
  /**
   * Defines the trigger event to load the script.
   */
  trigger?: ElementScriptTrigger
  /**
   * The client id for the paypal script.
   */
  clientId?: string
}>(), {
  width: 300,
  height: 150,
  trigger: 'visible',
  clientId: 'test',
})

const ready = ref(false)

const { onLoaded, status } = useScriptPaypal({
  clientId: props.clientId,
  components: ['buttons'],
  sandbox: true,
})

onMounted(() => {
  onLoaded(async ({ paypal }) => {
    if (!el.value) return
    await paypal?.Buttons?.().render(el.value)
    ready.value = true
  })
})

const ScriptLoadingIndicator = resolveComponent('ScriptLoadingIndicator')

const trigger = useScriptTriggerElement({ trigger: props.trigger, el: rootEl })

const rootAttrs = computed(() => {
  return defu(props.rootAttrs, {
    'aria-busy': status.value === 'loading',
    'aria-label': status.value === 'awaitingLoad'
      ? 'Paypal Script Placeholder'
      : status.value === 'loading'
        ? 'Paypal Embed Loading'
        : 'Paypal Embed',
    'aria-live': 'polite',
    'role': 'application',
    'style': {
      position: 'relative',
      maxWidth: '100%',
      width: `${props.width}px`,
      height: `'auto'`,
      aspectRatio: `${props.width}/${props.height}`,
    },
    ...(trigger instanceof Promise ? trigger.ssrAttrs || {} : {}),
  }) as HTMLAttributes
})
</script>

<template>
  <div ref="rootEl" v-bind="rootAttrs">
    PAYPAL Buttons example
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
