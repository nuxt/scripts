<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue'
import { useScriptIntercom } from '../registry/intercom'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import type { ElementScriptTrigger } from '#nuxt-scripts/types'

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
const { status, onLoaded } = intercom
if (props.trigger === 'click') {
  onLoaded((instance) => {
    instance.Intercom('show')
  })
}

defineExpose({
  intercom,
})

let observer: MutationObserver
onMounted(() => {
  watch(status, (status) => {
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
    <slot v-else-if="status === 'loading' || !isReady" name="loading" />
    <slot v-else-if="status === 'error'" name="error" />
  </div>
</template>
