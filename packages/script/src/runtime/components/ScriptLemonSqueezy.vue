<script lang="ts">
import type { LemonSqueezyEventPayload } from '../registry/lemon-squeezy'

type LemonSqueezyEventHandler = (event: LemonSqueezyEventPayload) => void

const lemonSqueezyOwners: Array<{
  owner: symbol
  eventHandler: LemonSqueezyEventHandler
}> = []

function activateLemonSqueezyOwner(owner: symbol, eventHandler: LemonSqueezyEventHandler) {
  const existingIndex = lemonSqueezyOwners.findIndex(entry => entry.owner === owner)
  if (existingIndex !== -1)
    lemonSqueezyOwners.splice(existingIndex, 1)
  lemonSqueezyOwners.push({ owner, eventHandler })
}

function removeLemonSqueezyOwner(owner: symbol) {
  const index = lemonSqueezyOwners.findIndex(entry => entry.owner === owner)
  if (index === -1)
    return { _tag: 'Missing' } as const
  const wasActive = index === lemonSqueezyOwners.length - 1
  lemonSqueezyOwners.splice(index, 1)
  if (!wasActive)
    return { _tag: 'Inactive' } as const
  return {
    _tag: 'Active',
    nextHandler: lemonSqueezyOwners.at(-1)?.eventHandler || (() => {}),
  } as const
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
    const eventHandler = (event: LemonSqueezyEventPayload) => {
      emits('lemonSqueezyEvent', event)
    }
    Setup({ eventHandler })
    activateLemonSqueezyOwner(owner, eventHandler)
    Refresh()
    emits('ready', instance)
  })
})

onBeforeUnmount(() => {
  disposed = true
  // Lemon.js `Setup()` stores a single global `eventHandler`, which captures
  // this component's `emits` (and therefore the instance). Setup() replaces
  // rather than appends. Restore the previous mounted owner when the active
  // component leaves so its events are not lost.
  const removedOwner = removeLemonSqueezyOwner(owner)
  if (removedOwner._tag === 'Active' && import.meta.client && typeof window.LemonSqueezy?.Setup === 'function')
    window.LemonSqueezy.Setup({ eventHandler: removedOwner.nextHandler })
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
