<script lang="ts" setup>
import type { ElementScriptTrigger } from '../types'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { useScriptLemonSqueezy } from '../registry/lemon-squeezy'
import type { LemonSqueezyEventPayload } from '../registry/lemon-squeezy'
import { onMounted, ref } from '#imports'

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
const instance = useScriptLemonSqueezy({
  scriptOptions: {
    trigger: useScriptTriggerElement({ trigger: props.trigger, el: rootEl }),
  },
})
onMounted(() => {
  rootEl.value?.querySelectorAll('a[href]').forEach((a) => {
    a.classList.add('lemonsqueezy-button')
  })
  instance.$script.then(({ Setup, Refresh }) => {
    Setup({
      eventHandler(event) {
        emits('lemonSqueezyEvent', event)
      },
    })
    Refresh()
    emits('ready', instance)
  })
})
</script>

<template>
  <div ref="rootEl">
    <slot />
  </div>
</template>
