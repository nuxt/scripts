<script lang="ts">
let activeLemonSqueezyOwner: symbol | undefined
</script>

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
    Setup({
      eventHandler(event) {
        emits('lemonSqueezyEvent', event)
      },
    })
    activeLemonSqueezyOwner = owner
    Refresh()
    emits('ready', instance)
  })
})

onBeforeUnmount(() => {
  disposed = true
  // Lemon.js `Setup()` stores a single global `eventHandler`, which captures
  // this component's `emits` (and therefore the instance). Setup() replaces
  // rather than appends. Only the component that most recently installed the
  // handler may clear it; an older instance can unmount after a newer one.
  if (activeLemonSqueezyOwner === owner && import.meta.client && typeof window.LemonSqueezy?.Setup === 'function') {
    window.LemonSqueezy.Setup({ eventHandler() {} })
    activeLemonSqueezyOwner = undefined
  }
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
