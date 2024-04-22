<script lang="ts" setup>
import { useScriptLemonSqueezy } from '#imports'

defineProps<{
  href: string
}>()

const emits = defineEmits<{
  event: [{ event: string, data?: Record<string, any> }]
}>()

const instance = useScriptLemonSqueezy()
instance.Setup({
  eventHandler(event) {
    emits('event', event)
  },
})

defineExpose({
  instance,
})
</script>

<template>
  <a :href="href" class="lemonsqueezy-button">
    <slot />
  </a>
</template>
