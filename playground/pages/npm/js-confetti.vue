<script lang="ts" setup>
import { ref, useScriptTriggerElement, useScriptNpm, onMounted } from '#imports'

const mouseOverEl = ref()
export interface JSConfettiApi {
  JSConfetti: {
    new (): {
      addConfetti: (options?: { emojis: string[] }) => void
    }
  }
}

declare global {
  type Window = JSConfettiApi
}

const { then } = useScriptNpm<JSConfettiApi>({
  packageName: 'js-confetti',
  file: 'dist/js-confetti.browser.js',
  version: '0.12.0',
  scriptOptions: {
    trigger: useScriptTriggerElement({ trigger: 'mouseover', el: mouseOverEl }),
    use() {
      return { JSConfetti: window.JSConfetti }
    },
  },
})

function addConfetti(options: { emojis: string[] }) {
  then(({ JSConfetti }) => {
    const confetti = new JSConfetti()
    confetti.addConfetti(options)
  })
}

onMounted(() => {
  addConfetti({ emojis: ['L', 'O', 'A', 'D', 'E', 'D'] })
})
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
