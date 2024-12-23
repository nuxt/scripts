<script setup lang="ts">
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { useScriptCrisp } from '../registry/crisp'
import { ref, onMounted, onBeforeUnmount, watch, computed } from '#imports'
import type { ElementScriptTrigger } from '#nuxt-scripts/types'

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

let observer: MutationObserver
onMounted(() => {
  watch(status, (status) => {
    if (status === 'loaded') {
      observer = new MutationObserver(() => {
        if (document.getElementById('crisp-chatbox')) {
          isReady.value = true
          emits('ready', crisp)
          observer.disconnect()
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }
    else if (status === 'error') {
      emits('error')
    }
  })
})
onBeforeUnmount(() => {
  observer?.disconnect()
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
    <slot v-else-if="status === 'loading' || !isReady" name="loading" />
    <slot v-else-if="status === 'error'" name="error" />
  </div>
</template>
