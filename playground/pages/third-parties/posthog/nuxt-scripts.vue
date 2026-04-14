<script lang="ts" setup>
import { useHead, useScriptPostHog } from '#imports'

useHead({
  title: 'PostHog',
})

const { status, proxy } = useScriptPostHog({
  apiKey: 'phc_YOUR_API_KEY',
})

function captureEvent() {
  proxy.posthog.capture('button_clicked', {
    button_name: 'test',
  })
}

function identifyUser() {
  proxy.posthog.identify('user@example.com', {
    email: 'user@example.com',
    name: 'Test User',
  })
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
      <div class="flex gap-2 mt-4">
        <UButton @click="captureEvent">
          Capture Event
        </UButton>
        <UButton @click="identifyUser">
          Identify User
        </UButton>
      </div>
    </ClientOnly>
  </div>
</template>
