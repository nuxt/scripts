<script setup lang="ts">
import type { ElementScriptTrigger } from '#nuxt-scripts/types'
import { useMutationObserver } from '@vueuse/core'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { useScriptIntercom } from '../registry/intercom'

const props = withDefaults(defineProps<{
  appId: string
  apiBase?: string
  name?: string
  email?: string
  userId?: string
  // customizing the messenger
  alignment?: 'left' | 'right'
  horizontalPadding?: number
  verticalPadding?: number
  /**
   * Defines the trigger event to load the script.
   */
  trigger?: ElementScriptTrigger
}>(), {
  trigger: 'click',
})

const emits = defineEmits<{
  // our emit
  ready: [e: ReturnType<typeof useScriptIntercom>]
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
const intercom = useScriptIntercom({
  app_id: props.appId,
  // @ts-expect-error untyped
  app_base: props.apiBase,
  name: props.name,
  email: props.email,
  user_id: props.userId,
  alignment: props.alignment,
  horizontal_padding: props.horizontalPadding,
  vertical_padding: props.verticalPadding,
  scriptOptions: {
    trigger,
  },
})
const { status, onLoaded } = intercom
if (props.trigger === 'click') {
  onLoaded((instance) => {
    instance.Intercom('show')
  })
}

defineExpose({
  intercom,
})

const observerTarget = shallowRef<HTMLElement | null>(null)
function markReady() {
  if (isReady.value)
    return true
  if (!document.getElementById('intercom-frame'))
    return false
  isReady.value = true
  observerTarget.value = null
  emits('ready', intercom)
  return true
}
useMutationObserver(observerTarget, markReady, { childList: true, subtree: true })

onMounted(() => {
  watch(status, (status) => {
    if (status === 'loading' || status === 'loaded') {
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
    style: {
      display: isReady.value ? 'none' : 'block',
      bottom: `${props.verticalPadding || 20}px`,
      [props.alignment || 'right']: `${props.horizontalPadding || 20}px`,
    },
    ...(trigger instanceof Promise ? trigger.ssrAttrs || {} : {}),
  }
})
</script>

<template>
  <div
    ref="rootEl"
    v-bind="rootAttrs"
  >
    <slot :ready="isReady" />
    <slot v-if="status === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="status === 'error'" name="error" />
    <slot v-else-if="status === 'loading' || !isReady" name="loading" />
  </div>
</template>
