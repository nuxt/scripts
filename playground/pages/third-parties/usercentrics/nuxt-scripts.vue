<script lang="ts" setup>
import { onScopeDispose, ref } from 'vue'
import { useHead, useScriptUsercentrics } from '#imports'

useHead({ title: 'Usercentrics CMP' })

// Replace with your Usercentrics rulesetId. The bundled placeholder will not
// boot a real CMP, so the helpers below stay no-ops until you provide one
// (either here or via nuxt.config -> scripts.registry.usercentrics).
const { status, consent } = useScriptUsercentrics({
  rulesetId: 'PLACEHOLDER_RULESET_ID',
})

const lastEventAt = ref<string | null>(null)
const lastEventType = ref<string | null>(null)

if (import.meta.client) {
  const off = consent.onConsentChange((detail) => {
    lastEventAt.value = new Date().toISOString()
    lastEventType.value = detail?.type ?? null
  })
  onScopeDispose(off)
}
</script>

<template>
  <div>
    <h1>Usercentrics</h1>
    <ClientOnly>
      <div>status: {{ status }}</div>
      <div>last UC_UI_CMP_EVENT: {{ lastEventAt ?? '(none yet)' }} type: {{ lastEventType ?? '(none)' }}</div>
      <div class="space-x-2 mt-2">
        <UButton @click="consent.showFirstLayer()">
          Show banner
        </UButton>
        <UButton @click="consent.showSecondLayer()">
          Show privacy settings
        </UButton>
        <UButton @click="consent.acceptAll()">
          Accept all
        </UButton>
        <UButton @click="consent.denyAll()">
          Reject all
        </UButton>
      </div>
    </ClientOnly>
  </div>
</template>
