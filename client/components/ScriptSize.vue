<template>
  <div v-if="size" title="kb Size">
    <div class="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-neutral-700 text-neutral-300 rounded-full">
      {{ size }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  size?: string
}

defineProps<Props>()
</script>
