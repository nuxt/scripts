<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  color?: string
  size?: number
}>(), {
  color: 'currentColor',
  size: 30,
})

const styles = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}))
</script>

<template>
  <div class="loader" :styles="styles" aria-label="Loading..." role="status" />
</template>

<style scoped>
.loader {
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
