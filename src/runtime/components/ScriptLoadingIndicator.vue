<script setup lang="ts">
withDefaults(defineProps<{
  color?: string
}>(), {
  color: 'currentColor',
})
</script>

<template>
  <div class="loader" aria-label="Loading..." role="status" />
</template>

<style scoped>
.loader {
  position: absolute;
  bottom: 12px;
  left: 12px;
  width: 30px;
  height: 30px;
  border: 5px solid v-bind(color);
  opacity: 0.5;
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  box-sizing: border-box;
  animation: rotation 1s linear infinite;
}

@keyframes rotation {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
