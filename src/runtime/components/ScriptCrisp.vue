<script setup lang="ts">
import { useElementScriptTrigger } from '../composables/useElementScriptTrigger'
import { useScriptCrisp } from '../registry/crisp'
import { ref, onMounted, onBeforeUnmount, watch } from '#imports'
import type { ElementScriptTrigger } from '#nuxt-scripts'

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
}>()

const rootEl = ref(null)
const trigger = useElementScriptTrigger({ trigger: props.trigger, el: rootEl })

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
if (props.trigger === 'click')
  crisp.do('chat:open')
const { $script } = crisp

defineExpose({
  crisp,
})

let observer: MutationObserver
onMounted(() => {
  watch($script.status, (status) => {
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
  })
})
onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div
    ref="rootEl"
    :style="{ display: isReady ? 'none' : 'block' }"
  >
    <slot :ready="isReady" />
    <slot v-if="$script.status.value === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="$script.status.value === 'loading' || !isReady" name="loading" />
  </div>
</template>
