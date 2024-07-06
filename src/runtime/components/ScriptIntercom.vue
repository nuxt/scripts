<script setup lang="ts">
import { useScriptIntercom } from '../registry/intercom'
import { useElementScriptTrigger } from '../composables/useElementScriptTrigger'
import { ref, onMounted } from '#imports'
import type { ElementScriptTrigger } from '#nuxt-scripts'

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
}>()

const rootEl = ref(null)
const trigger = useElementScriptTrigger({ trigger: props.trigger, el: rootEl })

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
if (props.trigger === 'click')
  intercom.Intercom('show')
const { $script } = intercom

defineExpose({
  intercom,
})

// add a listener to detect when the dom element #crisp-chatbox is added
onMounted(() => {
  const observer = new MutationObserver(() => {
    if (document.getElementById('crisp-chatbox')) {
      isReady.value = true
      emits('ready', intercom)
      observer.disconnect()
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
})
</script>

<template>
  <div
    ref="rootEl"
    style="display: block; position: absolute; z-index: 100000; "
    :style="{ bottom: `${verticalPadding || 20}px`, [alignment || 'right']: `${horizontalPadding || 20}px` }"
  >
    <slot :ready="isReady" />
    <slot v-if="$script.status.value === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="$script.status.value === 'loading' || !isReady" name="loading" />
  </div>
</template>
