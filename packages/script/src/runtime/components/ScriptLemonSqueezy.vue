<script lang="ts">
import type { LemonSqueezyApi, LemonSqueezyEventPayload } from '../registry/lemon-squeezy'

type LemonSqueezyHandler = (event: LemonSqueezyEventPayload) => void

const lemonSqueezyHandlers = new Map<symbol, LemonSqueezyHandler>()
const dispatchLemonSqueezyEvent: LemonSqueezyHandler = (event) => {
  for (const handler of [...lemonSqueezyHandlers.values()])
    handler(event)
}

function registerLemonSqueezyHandler(
  owner: symbol,
  handler: LemonSqueezyHandler,
  setup: LemonSqueezyApi['Setup'],
) {
  lemonSqueezyHandlers.set(owner, handler)
  // Lemon.js replaces its global handler on load and reload. Reinstall the
  // stable dispatcher each time while retaining every live subscriber.
  setup({ eventHandler: dispatchLemonSqueezyEvent })
}

function unregisterLemonSqueezyHandler(owner: symbol) {
  const removed = lemonSqueezyHandlers.delete(owner)
  if (!removed || lemonSqueezyHandlers.size > 0)
    return
  if (import.meta.client && typeof window.LemonSqueezy?.Setup === 'function')
    window.LemonSqueezy.Setup({ eventHandler() {} })
}
</script>

<script lang="ts" setup>
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
const owner = Symbol('ScriptLemonSqueezy')
let disposed = false
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
    if (disposed)
      return
    registerLemonSqueezyHandler(owner, event => emits('lemonSqueezyEvent', event), Setup)
    Refresh()
    emits('ready', instance)
  })
})

onBeforeUnmount(() => {
  disposed = true
  unregisterLemonSqueezyHandler(owner)
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
