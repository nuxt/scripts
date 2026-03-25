<script setup lang="ts">
const { loadTime } = defineProps<{ loadTime?: string }>()
</script>

<template>
  <span v-if="loadTime" class="script-metric">
    <UIcon name="i-carbon-timer" class="text-[10px] opacity-50" />
    {{ loadTime }}
  </span>
</template>

<style scoped>
.script-metric {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 500;
  font-family: var(--font-mono);
  letter-spacing: -0.01em;
  border-radius: 9999px;
  background: oklch(75% 0.15 145 / 0.08);
  color: oklch(50% 0.12 145);
  border: 1px solid oklch(65% 0.15 145 / 0.12);
}

.dark .script-metric {
  background: oklch(45% 0.1 145 / 0.12);
  color: oklch(78% 0.12 145);
  border-color: oklch(55% 0.1 145 / 0.15);
}
</style>
