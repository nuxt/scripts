<script setup lang="ts">
import {ScriptPresetProxy} from "../../../../src/runtime/presets/proxy";
import { useScript } from '#imports'

const { status, loaded, error } = useScript({
  presets: [
    ScriptPresetProxy(),
  ],
  src: 'https://cdn.tailwindcss.com',
  // TODO get this working without setting mode to client
  mode: 'client',
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
