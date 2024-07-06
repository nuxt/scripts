<script setup lang="ts">
const isLoaded = ref(false)
</script>

<template>
  <div style="padding: 40px; position: relative;">
    <ScriptIntercom @ready="isLoaded = true" app-id="akg5rmxb" api-base="https://api-iam.intercom.io" alignment="left" :horizontal-padding="0" class="intercom">
      <div style="display: flex; align-items: center; justify-content: center; width: 48px; height: 48px;">
        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 28 32"><path d="M28 32s-4.714-1.855-8.527-3.34H3.437C1.54 28.66 0 27.026 0 25.013V3.644C0 1.633 1.54 0 3.437 0h21.125c1.898 0 3.437 1.632 3.437 3.645v18.404H28V32zm-4.139-11.982a.88.88 0 00-1.292-.105c-.03.026-3.015 2.681-8.57 2.681-5.486 0-8.517-2.636-8.571-2.684a.88.88 0 00-1.29.107 1.01 1.01 0 00-.219.708.992.992 0 00.318.664c.142.128 3.537 3.15 9.762 3.15 6.226 0 9.621-3.022 9.763-3.15a.992.992 0 00.317-.664 1.01 1.01 0 00-.218-.707z" /></svg>
      </div>
    </ScriptIntercom>
    <div class="text-center">
      <UAlert v-if="!isLoaded" class="mb-5" size="sm" color="blue" variant="soft" title="Click to load" description="Clicking the button to the right will load the Intercom script" />
      <UAlert v-else color="green" variant="soft" title="Crisp is loaded" description="The Intercom Facade component is no longer being displayed." />
    </div>
  </div>
</template>

<style>
.intercom {
  position: relative; /* change to fixed */
  z-index: 100000;
  width: 48px;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  background-color: #0071b2;
  filter: drop-shadow(rgba(0, 0, 0, 0.06) 0px 1px 6px) drop-shadow(rgba(0, 0, 0, 0.16) 0px 2px 32px);
}
</style>
