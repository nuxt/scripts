<script setup lang="ts">
const { status } = useScriptSpeedCurve({ id: 'TEST_LUX_ID' })
</script>

<template>
  <div>
    <p id="status">
      {{ status }}
    </p>
  </div>
</template>
