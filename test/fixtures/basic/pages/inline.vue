<script setup lang="ts">
import { useScript } from '#imports'
import {ScriptPresetInline} from "../../../../src/runtime/presets/inline";

const { status, loaded, error } = useScript({
  presets: [
    ScriptPresetInline(),
  ],
  src: 'https://cdn.tailwindcss.com',
  integrity: 'sha256-ChValuzd0cyaDyQRGsHBMsFX2hzljF1GK3M80fFrnAk=',
  tagPosition: 'bodyOpen',
})
</script>
<template>
  <div class="p-5">
    <div>status: {{ status }}</div>
    <div>error: {{ error }}</div>
    <div
      v-if="loaded"
      class="bg-green-500 text-white font-bold py-2 px-4 rounded"
    >
      Tailwind is loaded!
    </div>
  </div>
</template>
