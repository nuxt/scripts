<script setup lang="ts">
const { size } = defineProps<{ size?: string }>()
</script>

<template>
  <span v-if="size" class="script-metric">
    <UIcon name="i-carbon-meter" class="text-[10px] opacity-50" />
    {{ size }}
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
  background: var(--color-surface-sunken);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border-subtle);
}
</style>
