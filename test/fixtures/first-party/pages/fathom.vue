<script lang="ts" setup>
import { useHead, useScriptFathomAnalytics } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Fathom - First Party' })
const { status } = useScriptFathomAnalytics({ site: 'BRDEJWKJ' })
const result = ref('')

function trackPageview() {
  ;(window as any).fathom.trackPageview()
  result.value = 'Pageview tracked'
}

function trackGoal() {
  ;(window as any).fathom.trackGoal('TEST123', 0)
  result.value = 'Goal tracked'
}
</script>

<template>
  <div>
    <h1>Fathom First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button @click="trackPageview">
        Track Pageview
      </button>
      <button @click="trackGoal">
        Track Goal
      </button>
      <p v-if="result">
        {{ result }}
      </p>
    </div>
  </div>
</template>
