<script lang="ts" setup>
import type { ElementScriptTrigger } from '../types'
import { onMounted, ref, useElementScriptTrigger, useScriptLemonSqueezy } from '#imports'

const props = withDefaults(defineProps<{
  trigger?: ElementScriptTrigger
  href: string
}>(), {
  trigger: 'visible',
})

const emits = defineEmits<{
  event: [{ event: string, data?: Record<string, any> }]
}>()

const rootEl = ref<HTMLElement | null>(null)
const { $script } = useScriptLemonSqueezy({
  scriptOptions: {
    trigger: useElementScriptTrigger({ trigger: props.trigger, el: rootEl }),
  },
})
onMounted(() => {
  $script.then(({ Setup }) => {
    Setup({
      eventHandler(event) {
        emits('event', event)
      },
    })
  })
})
</script>

<template>
  <div ref="rootEl">
    <slot v-bind="{ class: 'lemonsqueezy-button', href }">
      <a :href="href" class="lemonsqueezy-button">
        Buy me
      </a>
    </slot>
  </div>
</template>
