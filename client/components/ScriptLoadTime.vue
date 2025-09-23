<template>
  <div>
    <div class="inline-flex items-center px-2 py-0.5 text-xs font-medium m bg-neutral-700 text-green-300 rounded-full">
      {{ loadTime }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  loadTime?: string
}

defineProps<Props>()
</script>
