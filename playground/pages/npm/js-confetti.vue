<script lang="ts" setup>
import { ref, useScriptTriggerElement, useScriptNpm } from '#imports'

const mouseOverEl = ref()
const { addConfetti } = useScriptNpm<JSConfettiApi>({
  packageName: 'js-confetti',
  file: 'dist/js-confetti.browser.js',
  version: '0.12.0',
  scriptOptions: {
    trigger: useScriptTriggerElement({ trigger: 'mouseover', el: mouseOverEl }),
    bundle: true,
    use() {
      return typeof window.JSConfetti !== 'undefined' && new window.JSConfetti()
    },
  },
})

addConfetti({ emojis: ['L', 'O', 'A', 'D', 'E', 'D'] })
</script>

<template>
  <button
    @click="() => addConfetti({ emojis: ['🌈', '⚡️', '💥', '✨', '💫', '🌸'] })"
  >
    Add Confetti
  </button>
  <div ref="mouseOverEl">
    <h1>Hover over me to load the confetti</h1>
  </div>
</template>
