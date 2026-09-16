<script setup lang="ts">
const style = blankStyle('#ffffff')
</script>

<template>
  <div>
    <div id="keyboard-map">
      <ScriptMapLibreMap
        trigger="immediate"
        :map-style="style"
        :center="[0, 0]"
        :width="300"
        :height="200"
        aria-label="Keyboard map"
      />
    </div>
    <div id="pointer-map">
      <ScriptMapLibreMap
        trigger="immediate"
        :map-style="style"
        :center="[0, 0]"
        :width="300"
        :height="200"
        :options="{ keyboard: false }"
        aria-label="Pointer map"
      />
    </div>
    <div id="static-map">
      <ScriptMapLibreMap
        trigger="immediate"
        :map-style="style"
        :center="[0, 0]"
        :width="300"
        :height="200"
        :interactive="false"
      />
    </div>
  </div>
</template>
