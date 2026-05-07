<script lang="ts" setup>
// Overrides the parent layer's pages/calendly.vue with `bundle: false` so
// the script loads from assets.calendly.com instead of /_scripts/assets/.
import { useHead, useScriptCalendly } from '#imports'

useHead({ title: 'Calendly' })

const { status, proxy } = useScriptCalendly({
  scriptOptions: { bundle: false },
})

function queueInitInline() {
  proxy.Calendly.initInlineWidget({
    url: 'https://calendly.com/example/30min',
    parentElement: '#calendly-host',
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
