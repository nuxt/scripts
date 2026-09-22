<script setup lang="ts">
const el = ref<HTMLElement>()
const { status } = useScript('/probe.js?trigger=visible', {
  trigger: useScriptTriggerElement({ trigger: 'visible', el }),
})
useStatusLog('visible', status)
</script>

<template>
  <div id="status" ref="el">{{ status }}</div>
</template>
