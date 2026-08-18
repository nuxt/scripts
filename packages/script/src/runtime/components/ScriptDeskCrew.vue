<script setup lang="ts">
import type { ElementScriptTrigger } from '#nuxt-scripts/types'
import { useMutationObserver } from '@vueuse/core'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { useScriptDeskCrew } from '../registry/deskcrew'

const props = withDefaults(defineProps<{
  /**
   * Defines the trigger event to load the script.
   */
  trigger?: ElementScriptTrigger
  widgetKey: string
  board?: string
  color?: string
  position?: 'left' | 'right'
  greeting?: string
  launcher?: 'logo'
}>(), {
  trigger: 'click',
})

const emits = defineEmits<{
  ready: [e: ReturnType<typeof useScriptDeskCrew>]
  error: []
}>()

defineSlots<{
  default?: (props: { ready: boolean }) => any
  awaitingLoad?: () => any
  loading?: () => any
  error?: () => any
}>()

const rootEl = ref(null)
const trigger = useScriptTriggerElement({ trigger: props.trigger, el: rootEl })

const isReady = ref(false)
const deskcrew = useScriptDeskCrew({
  widgetKey: props.widgetKey,
  board: props.board,
  color: props.color,
  position: props.position,
  greeting: props.greeting,
  launcher: props.launcher,
  scriptOptions: {
    trigger,
  },
})
const { onLoaded, status } = deskcrew
if (props.trigger === 'click') {
  onLoaded((instance) => {
    instance.open()
  })
}

defineExpose({
  deskcrew,
})

const observerTarget = shallowRef<HTMLElement | null>(null)
function markReady() {
  if (isReady.value)
    return true
  // The widget mounts a Shadow DOM host into document.body with this id, so its
  // presence is the only reliable signal that the UI actually exists. Waiting on
  // script load alone would flip the facade away before anything is rendered.
  if (!document.getElementById('deskcrew-root'))
    return false
  isReady.value = true
  observerTarget.value = null
  emits('ready', deskcrew)
  return true
}
useMutationObserver(observerTarget, markReady, { childList: true, subtree: true })

onMounted(() => {
  watch(status, (status) => {
    if (status === 'loaded') {
      if (!markReady())
        observerTarget.value = document.body
    }
    else if (status === 'error') {
      observerTarget.value = null
      isReady.value = false
      emits('error')
    }
  }, { immediate: true })
})

const rootAttrs = computed(() => {
  return {
    ...(trigger instanceof Promise ? trigger.ssrAttrs || {} : {}),
  }
})
</script>

<template>
  <div
    ref="rootEl"
    :style="{ display: isReady ? 'none' : 'block' }"
    v-bind="rootAttrs"
  >
    <slot :ready="isReady" />
    <slot v-if="status === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="status === 'error'" name="error" />
    <slot v-else-if="status === 'loading' || !isReady" name="loading" />
  </div>
</template>
