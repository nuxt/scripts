<script lang="ts" setup>
import { useHead, useScriptNpm } from '#imports'
import { ref } from 'vue'

useHead({ title: 'NPM - First Party' })
const { status, onLoaded } = useScriptNpm({ packageName: 'js-confetti', file: 'dist/js-confetti.browser.js', version: '0.12.0' })
const result = ref('')

function fireConfetti() {
  onLoaded(() => {
    // js-confetti attaches to window.JSConfetti
    const JSConfetti = (window as any).JSConfetti
    if (JSConfetti) {
      const confetti = new JSConfetti()
      confetti.addConfetti()
      result.value = 'Confetti fired!'
    }
    else {
      result.value = 'JSConfetti not found on window'
    }
  })
}
</script>

<template>
  <div>
    <h1>NPM (js-confetti) First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button @click="fireConfetti">
        Fire Confetti 🎉
      </button>
      <p v-if="result">
        {{ result }}
      </p>
    </div>
  </div>
</template>
