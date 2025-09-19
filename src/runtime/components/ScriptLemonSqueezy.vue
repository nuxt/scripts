<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import type { ElementScriptTrigger } from '../types'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { useScriptLemonSqueezy } from '../registry/lemon-squeezy'
import type { LemonSqueezyEventPayload } from '../registry/lemon-squeezy'

const props = withDefaults(defineProps<{
  trigger?: ElementScriptTrigger
}>(), {
  trigger: 'visible',
})

const emits = defineEmits<{
  ready: [ReturnType<typeof useScriptLemonSqueezy>]
  lemonSqueezyEvent: [LemonSqueezyEventPayload]
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
