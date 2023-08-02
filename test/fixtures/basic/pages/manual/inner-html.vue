<script setup lang="ts">
import { useScript } from '#imports'
import {ScriptPresetLoadManual} from "../../../../../src/runtime/presets/manual";

const { status, loaded, error } = useScript({
  presets: [
    ScriptPresetLoadManual(new Promise((resolve) => {
      setTimeout(() => {
        resolve()
      }, 1000)
    })),
  ],
  innerHTML: '(() => {\n' +
    '  document.body.style.backgroundColor = \'salmon\';\n' +
    '})();',
})
</script>
<template>
  <div class="p-5">
    <div>status: {{ status }}</div>
    <div>error: {{ error }}</div>
    <div v-if="loaded">
      bg is salmon
    </div>
  </div>
</template>
