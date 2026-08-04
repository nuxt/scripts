<script setup lang="ts">
import type { ElementScriptTrigger } from '#nuxt-scripts/types'
import { useMutationObserver } from '@vueuse/core'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { useScriptCrisp } from '../registry/crisp'

const props = withDefaults(defineProps<{
  /**
   * Defines the trigger event to load the script.
   */
  trigger?: ElementScriptTrigger
  id: string
  runtimeConfig?: {
    locale: string
  }
  tokenId?: string
  cookieDomain?: string
  cookieExpiry?: number
}>(), {
  trigger: 'click',
})

const emits = defineEmits<{
  // our emit
  ready: [e: ReturnType<typeof useScriptCrisp>]
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
const crisp = useScriptCrisp({
  id: props.id,
  runtimeConfig: props.runtimeConfig,
  tokenId: props.tokenId,
  cookieDomain: props.cookieDomain,
  cookieExpiry: props.cookieExpiry,
  scriptOptions: {
    trigger,
  },
})
const { onLoaded, status } = crisp
if (props.trigger === 'click') {
  onLoaded((instance) => {
    instance.do('chat:open')
  })
}

defineExpose({
  crisp,
})

const observerTarget = shallowRef<HTMLElement | null>(null)
function markReady() {
  if (isReady.value)
    return true
  if (!document.getElementById('crisp-chatbox'))
    return false
  isReady.value = true
  observerTarget.value = null
  emits('ready', crisp)
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
