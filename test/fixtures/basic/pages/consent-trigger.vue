<script setup lang="ts">
import { useRoute, useScript, useScriptMetaPixel, useScriptTriggerConsent } from '#imports'
import { computed, defineComponent, h, unref } from 'vue'

const mode = useRoute().query.mode
const consent = useScriptTriggerConsent()
const first = mode === 'infrastructure'
  ? useScriptMetaPixel()
  : mode === 'manual'
    ? useScriptMetaPixel({ scriptOptions: { trigger: false } })
    : mode === 'registry'
      ? useScriptMetaPixel({ scriptOptions: { trigger: consent } })
      : useScript('/myScript.js', { trigger: consent, bundle: false })
const status = computed(() => first.status)

const LaterConsumer = defineComponent({
  setup() {
    const later = mode === 'registry'
      ? useScriptMetaPixel()
      : mode === 'explicit'
        ? useScript('/myScript.js', { trigger: 'client', bundle: false })
        : useScript('/myScript.js')
    return () => h('p', { id: 'later-status' }, unref(later.status))
  },
})
</script>

<template>
  <p id="status">{{ status }}</p>
  <p id="consented">{{ consent.consented }}</p>
  <LaterConsumer v-if="mode === 'registry' || mode === 'generic' || mode === 'explicit'" />
  <button id="accept" @click="consent.accept()">Accept</button>
  <button id="load" @click="first.load()">Load</button>
</template>
