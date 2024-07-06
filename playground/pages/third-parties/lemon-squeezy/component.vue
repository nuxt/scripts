<script lang="ts" setup>
import type { LemonSqueezyEventPayload } from '../../../../src/runtime/registry/lemon-squeezy'
import { ref } from '#imports'

const ready = ref(false)
const events = ref<LemonSqueezyEventPayload[]>([])
function handleEvent(payload: LemonSqueezyEventPayload) {
  events.value.push(payload)
}
</script>

<template>
  <div>
    <ScriptLemonSqueezy @lemon-squeezy-event="handleEvent" @ready="ready = true">
      <UButton to="https://harlantest.lemonsqueezy.com/buy/52a40427-36d2-4450-a514-ae80d9e1a333?embed=1" class="block mb-3">
        Buy me - $10
      </UButton>
      <UButton to="https://harlantest.lemonsqueezy.com/buy/76bbfa74-a81a-4111-8449-4f5ad564ed76?embed=1" class="block">
        Buy me - pay what you want
      </UButton>
    </ScriptLemonSqueezy>
    <div class="my-5 font-mono">
      <div>Events</div>
      <ul>
        <li v-for="event in events">
          {{ event.event }}
        </li>
      </ul>
    </div>
    <NuxtLink to="/third-parties/lemon-squeezy/script" class="underline">
      back
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
</script>
