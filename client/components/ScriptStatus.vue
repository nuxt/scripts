<template>
  <div class="flex items-center gap-2">
    <div
      class="w-2 h-2 rounded-full"
      :class="statusColor"
    />
    <span class="capitalize text-sm">{{ displayStatus }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  status?: string
  error?: string
}

const props = defineProps<Props>()

const displayStatus = computed(() => {
  if (props.error) {
    return props.error === 'TypeError: Failed to fetch' ? 'CORS Error' : props.error
  }
  return props.status || 'unknown'
})

const statusColor = computed(() => {
  if (props.error) {
    return 'bg-red-500'
  }

  switch (props.status) {
    case 'loaded':
      return 'bg-green-500'
    case 'loading':
      return 'bg-blue-500'
    case 'awaitingLoad':
      return 'bg-yellow-500'
    case 'error':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
})
</script>
