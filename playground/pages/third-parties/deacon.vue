<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  title: 'Deacon',
})

// Replace this placeholder with the key from the Install page in Deacon.
const { status, proxy } = useScriptDeacon({
  key: 'pk_your_widget_key',
  context: { plan: 'free' },
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

function openChat() {
  proxy.open()
}

function signIn() {
  proxy.identify({ id: 'user_123', email: 'reader@example.com', name: 'Sam Reader' })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        Deacon
      </h1>
      <p class="text-gray-600 mt-2">
        An AI support agent that answers from your own content. The loader comes straight from heydeacon.com.
      </p>
      <UAlert
        icon="i-heroicons-information-circle"
        color="info"
        variant="soft"
        class="mt-4"
        title="Placeholder key"
        description="pk_your_widget_key is a placeholder. Use the key from the Install page in Deacon, with localhost added to its sites, to chat."
      />
    </div>

    <UCard>
      <div class="space-y-4">
        <div>
          <span class="font-medium">Current Status:</span>
          <UBadge
            id="status"
            :color="status === 'loaded' ? 'success' : status === 'loading' ? 'warning' : 'neutral'"
            class="ml-2"
          >
            {{ status }}
          </UBadge>
        </div>

        <div class="flex gap-2">
          <UButton @click="openChat">
            Open the chat
          </UButton>
          <UButton color="neutral" variant="outline" @click="signIn">
            Pass a logged-in user
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
