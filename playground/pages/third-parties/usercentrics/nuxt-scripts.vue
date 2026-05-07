<script lang="ts" setup>
import { onScopeDispose, ref } from 'vue'
import { useHead, useScriptUsercentrics } from '#imports'

useHead({ title: 'Usercentrics CMP' })

// Replace with your Usercentrics settingsId. The bundled placeholder will not
// boot a real CMP, so the helpers below stay no-ops until you provide one
// (either here or via nuxt.config -> scripts.registry.usercentrics).
const { status, consent } = useScriptUsercentrics({
  settingsId: 'PLACEHOLDER_SETTINGS_ID',
})

const lastEventAt = ref<string | null>(null)
const services = ref<{ id: string, name: string, granted: boolean }[]>([])

if (import.meta.client) {
  const off = consent.onConsentChange(() => {
    lastEventAt.value = new Date().toISOString()
    services.value = (window.UC_UI?.getServicesBaseInfo?.() || []).map(s => ({
      id: s.id,
      name: s.name,
      granted: !!s.consent?.status,
    }))
  })
  onScopeDispose(off)
}
</script>

<template>
  <div>
    <h1>Usercentrics</h1>
    <ClientOnly>
      <div>status: {{ status }}</div>
      <div>last UC_CONSENT: {{ lastEventAt ?? '(none yet)' }}</div>
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
      <div v-if="services.length" class="mt-4">
        <h2>Services</h2>
        <ul>
          <li v-for="s in services" :key="s.id">
            <code>{{ s.id }}</code> &mdash; {{ s.name }} &mdash;
            <strong>{{ s.granted ? 'granted' : 'denied' }}</strong>
          </li>
        </ul>
      </div>
    </ClientOnly>
  </div>
</template>
