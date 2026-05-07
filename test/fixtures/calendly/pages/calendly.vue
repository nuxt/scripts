<script lang="ts" setup>
import { useHead, useScriptCalendly } from '#imports'

useHead({ title: 'Calendly' })

const { status, proxy } = useScriptCalendly()

function queueInitInline() {
  const parentElement = document.querySelector<HTMLElement>('#calendly-host')
  if (!parentElement)
    return
  // Pre-load call: must land on the stub queue, then replay against the real
  // Calendly object once the script finishes loading.
  proxy.Calendly.initInlineWidget({
    url: 'https://calendly.com/example/30min',
    parentElement,
  })
}
</script>

<template>
  <div>
    <h1>Calendly</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <button id="trigger-queue" @click="queueInitInline">
      Queue init
    </button>
    <div id="calendly-host" style="min-width: 320px; height: 600px" />
  </div>
</template>
