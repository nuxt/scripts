<script setup lang="ts">
import { useScript, ref } from '#imports'
import {ScriptPresetLoadManual} from "../../../../../src/runtime/presets/manual";
import {ScriptPresetInline} from "../../../../../src/runtime/presets/inline";

const buttonText = ref('Load Tailwind')

const tailwind = ref(false)

const { status, loaded, error } = useScript({
  presets: [
    ScriptPresetLoadManual(tailwind),
    ScriptPresetInline(),
  ],
  src: 'https://cdn.tailwindcss.com',
  integrity: 'sha256-ChValuzd0cyaDyQRGsHBMsFX2hzljF1GK3M80fFrnAk=',
  onload() {
    buttonText.value = 'Loaded Tailwind'
    console.log('onload')
  }
})

function loadTailwind() {
  tailwind.value = true
  console.log('loadTailwind')
}
</script>
<template>
  <div class="p-5">
    <div>status: {{ status }}</div>
    <div>error: {{ error }}</div>
    <button
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      @click="loadTailwind"
    >
      {{ buttonText }}
    </button>
    <div v-if="loaded">
      Tailwind is loaded!
    </div>
  </div>
</template>
