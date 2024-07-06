<script setup lang="ts">
import { useScriptIntercom } from '../registry/intercom'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { ref, onMounted, watch, onBeforeUnmount } from '#imports'
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
  error: []
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
if (props.trigger === 'click')
  intercom.Intercom('show')
const { $script } = intercom

defineExpose({
  intercom,
})

let observer: MutationObserver
onMounted(() => {
  watch($script.status, (status) => {
    if (status === 'loading') {
      observer = new MutationObserver(() => {
        if (document.getElementById('intercom-frame')) {
          isReady.value = true
          emits('ready', intercom)
          observer.disconnect()
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }
    else if (status === 'error')
      emits('error')
  })
})
onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div
    ref="rootEl"
    :style="{
      display: isReady ? 'none' : 'block',
      bottom: `${verticalPadding || 20}px`,
      [alignment || 'right']: `${horizontalPadding || 20}px`,
    }"
  >
    <slot :ready="isReady" />
    <slot v-if="$script.status.value === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="$script.status.value === 'loading' || !isReady" name="loading" />
    <slot v-else-if="$script.status.value === 'error'" name="error" />
  </div>
</template>
