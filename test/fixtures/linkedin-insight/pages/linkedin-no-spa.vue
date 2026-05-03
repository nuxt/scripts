<script lang="ts" setup>
// Overrides the fixture's `enableAutoSpaTracking: true` default.
import { navigateTo, useHead, useScriptLinkedInInsight } from '#imports'

useHead({ title: 'LinkedIn Insight Tag - No SPA' })

const { status } = useScriptLinkedInInsight({
  enableAutoSpaTracking: false,
})

// Targets / (no LinkedIn composable) so the post-nav page can't fire its own
// track and pollute the negative assertion.
function navigateSpa() {
  navigateTo('/')
}
</script>

<template>
  <div>
    <h1>LinkedIn Insight Tag - No SPA</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <button id="trigger-spa-nav" @click="navigateSpa">
      Navigate (SPA)
    </button>
  </div>
</template>
