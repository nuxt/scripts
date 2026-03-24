<script setup lang="ts">
const { status, error } = defineProps<{
  status?: string
  error?: string
}>()

const displayStatus = computed(() => {
  if (error)
    return error === 'TypeError: Failed to fetch' ? 'CORS Error' : error
  return status || 'unknown'
})

const statusClass = computed(() => {
  if (error || status === 'error')
    return 'status-error'
  switch (status) {
    case 'loaded': return 'status-loaded'
    case 'loading': return 'status-loading'
    case 'awaitingLoad': return 'status-awaiting'
    case 'validation-failed': return 'status-validation'
    default: return 'status-unknown'
  }
})
</script>

<template>
  <div class="script-status" :class="statusClass">
    <span class="script-status-dot" />
    <span class="capitalize">{{ displayStatus }}</span>
  </div>
</template>

<style scoped>
.script-status {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  border-radius: 9999px;
  line-height: 1.4;
}

.script-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-loaded {
  background: oklch(75% 0.15 145 / 0.12);
  color: oklch(45% 0.15 145);
}
.status-loaded .script-status-dot {
  background: oklch(65% 0.2 145);
  box-shadow: 0 0 6px oklch(65% 0.2 145 / 0.5);
}
.dark .status-loaded {
  background: oklch(50% 0.15 145 / 0.15);
  color: oklch(78% 0.15 145);
}

.status-loading {
  background: oklch(75% 0.12 250 / 0.1);
  color: oklch(50% 0.15 250);
}
.status-loading .script-status-dot {
  background: oklch(60% 0.18 250);
  animation: pulse-dot 1.5s ease-in-out infinite;
}
.dark .status-loading {
  background: oklch(45% 0.1 250 / 0.15);
  color: oklch(75% 0.12 250);
}

.status-awaiting {
  background: oklch(80% 0.08 80 / 0.1);
  color: oklch(55% 0.12 80);
}
.status-awaiting .script-status-dot {
  background: oklch(70% 0.15 80);
}
.dark .status-awaiting {
  background: oklch(45% 0.06 80 / 0.15);
  color: oklch(75% 0.1 80);
}

.status-error {
  background: oklch(65% 0.12 25 / 0.1);
  color: oklch(50% 0.15 25);
}
.status-error .script-status-dot {
  background: oklch(60% 0.2 25);
}
.dark .status-error {
  background: oklch(45% 0.1 25 / 0.15);
  color: oklch(72% 0.12 25);
}

.status-validation {
  background: oklch(70% 0.1 300 / 0.1);
  color: oklch(50% 0.12 300);
}
.status-validation .script-status-dot {
  background: oklch(60% 0.15 300);
}
.dark .status-validation {
  background: oklch(40% 0.08 300 / 0.15);
  color: oklch(75% 0.1 300);
}

.status-unknown {
  background: var(--color-surface-sunken);
  color: var(--color-text-muted);
}
.status-unknown .script-status-dot {
  background: var(--color-neutral-400);
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}
</style>
