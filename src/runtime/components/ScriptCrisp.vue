<script setup lang="ts">
import { useElementScriptTrigger } from '../composables/useElementScriptTrigger'
import type { CrispOptions } from '../registry/crisp'
import { useScriptCrisp } from '../registry/crisp'
import { ref, onMounted } from '#imports'
import type { ElementScriptTrigger } from '#nuxt-scripts'
import type { InferInput } from '#nuxt-scripts-validator'

type Crisp = InferInput<typeof CrispOptions>

const props = withDefaults(defineProps<Crisp & {
  /**
   * Defines the trigger event to load the script.
   */
  trigger?: ElementScriptTrigger
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
  ...props,
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

// add a listener to detect when the dom element #crisp-chatbox is added
onMounted(() => {
  const observer = new MutationObserver(() => {
    if (document.getElementById('crisp-chatbox')) {
      isReady.value = true
      emits('ready', crisp)
      observer.disconnect()
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
})
</script>

<template>
  <div
    ref="rootEl"
    style="display: block; position: absolute; bottom: 14px; right: 14px; z-index: 100000;"
  >
    <slot :ready="isReady" />
    <slot v-if="$script.status.value === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="$script.status.value === 'loading' || !isReady" name="loading" />
  </div>
</template>
