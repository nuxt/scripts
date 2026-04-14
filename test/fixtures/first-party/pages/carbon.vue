<script lang="ts" setup>
import { useHead } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Carbon Ads - First Party' })
// CarbonAds is component-only (no composable), track status via events
const status = ref('awaitingLoad')
function onReady() { status.value = 'loaded' }
function onError() { status.value = 'error' }
</script>

<template>
  <div>
    <h1>Carbon Ads First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
      <ScriptCarbonAds serve="CW7DTKJL" placement="unlighthousedev" format="cover" @ready="onReady" @error="onError" />
    </ClientOnly>
  </div>
</template>
