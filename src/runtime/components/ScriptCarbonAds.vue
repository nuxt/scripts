<script setup lang="ts">
import { withQuery } from 'ufo'
import { onBeforeUnmount, onMounted, ref, useElementScriptTrigger } from '#imports'
import type { ElementScriptTrigger } from '#nuxt-scripts'

const props = defineProps<{
  serve: string
  placement: string
  /**
   * Defines the trigger event to load the script.
   */
  trigger?: ElementScriptTrigger
}>()

const emit = defineEmits<{
  error: [error: string | Event]
  load: []
}>()

const attrId = `_carbonads_js`
const carbonadsEl = ref<HTMLElement | null>(import.meta.client ? document.getElementById(attrId) : null)
// syncs to useScript status
const status = ref('awaitingLoad')

function loadCarbon() {
  if (!carbonadsEl.value) {
    return
  }
  status.value = 'loading'
  const script = document.createElement('script')
  script.setAttribute('type', 'text/javascript')
  script.setAttribute('src', withQuery('https://cdn.carbonads.com/carbon.js', {
    serve: props.serve,
    placement: props.placement,
  }))
  script.setAttribute('id', attrId)
  script.onerror = (err) => {
    status.value = 'error'
    emit('error', err)
  }
  script.onload = () => {
    status.value = 'loaded'
    emit('load')
  }
  carbonadsEl.value.appendChild(script)
}

onMounted(() => {
  if (!props.trigger) {
    loadCarbon()
  }
  else {
    useElementScriptTrigger({ trigger: props.trigger, el: carbonadsEl })
  }
})

onBeforeUnmount(() => {
  if (carbonadsEl.value) {
    carbonadsEl.value.remove()
  }
})
</script>

<template>
  <div ref="carbonadsEl">
    <slot v-if="status === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="status === 'loading'" name="loading" />
    <slot v-else-if="status === 'error'" name="error" />
  </div>
</template>
