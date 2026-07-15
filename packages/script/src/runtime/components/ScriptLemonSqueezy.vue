<script lang="ts" setup>
import type { LemonSqueezyEventPayload } from '../registry/lemon-squeezy'
import type { ElementScriptTrigger } from '../types'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { useScriptLemonSqueezy } from '../registry/lemon-squeezy'

const props = withDefaults(defineProps<{
  trigger?: ElementScriptTrigger
}>(), {
  trigger: 'visible',
})

const emits = defineEmits<{
  ready: [ReturnType<typeof useScriptLemonSqueezy>]
  lemonSqueezyEvent: [LemonSqueezyEventPayload]
}>()

defineSlots<{
  default?: () => any
}>()

const rootEl = ref<HTMLElement | null>(null)
const trigger = useScriptTriggerElement({ trigger: props.trigger, el: rootEl })
const instance = useScriptLemonSqueezy({
  scriptOptions: {
    trigger,
  },
})
onMounted(() => {
  rootEl.value?.querySelectorAll('a[href]').forEach((a) => {
    a.classList.add('lemonsqueezy-button')
  })
  instance.onLoaded(({ Setup, Refresh }) => {
    Setup({
      eventHandler(event) {
        emits('lemonSqueezyEvent', event)
      },
    })
    Refresh()
    emits('ready', instance)
  })
})

onBeforeUnmount(() => {
  // Lemon.js `Setup()` stores a single global `eventHandler`, which captures
  // this component's `emits` (and therefore the instance). Setup() replaces
  // rather than appends, so resetting it to a noop on unmount releases the
  // closure and lets the unmounted instance be garbage-collected.
  if (import.meta.client && typeof window.LemonSqueezy?.Setup === 'function')
    window.LemonSqueezy.Setup({ eventHandler() {} })
})

const rootAttrs = computed(() => {
  return {
    ...(trigger instanceof Promise ? trigger.ssrAttrs || {} : {}),
  }
})
</script>

<template>
  <div ref="rootEl" v-bind="rootAttrs">
    <slot />
  </div>
</template>
