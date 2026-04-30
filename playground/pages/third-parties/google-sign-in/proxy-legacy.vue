<script lang="ts" setup>
import type { CredentialResponse } from '#nuxt-scripts/registry/google-sign-in'
import { useHead, useRuntimeConfig, useScriptGoogleSignIn } from '#imports'

useHead({ title: 'Google Sign-In · Legacy proxy' })

// Backward-compat: the original `proxy.accounts.id.*` access path still works.
// Use this if you need to call APIs not covered by the helpers (cancel, etc).
const clientId = useRuntimeConfig().public.scripts.googleSignIn.clientId
const { proxy, status, onLoaded } = useScriptGoogleSignIn()
const buttonRef = useTemplateRef<HTMLDivElement>('buttonRef')
const credential = ref<string | null>(null)

onLoaded(() => {
  proxy.accounts.id.initialize({
    client_id: clientId,
    callback: (r: CredentialResponse) => {
      credential.value = r.credential
    },
  })
})

watch(buttonRef, (el) => {
  if (el) {
    onLoaded(({ accounts }) => {
      accounts.id.renderButton(el, { text: 'signin_with' })
    })
  }
}, { immediate: true })
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold">
      Legacy proxy access
    </h1>
    <p class="text-sm text-gray-600">
      Status: <strong>{{ status }}</strong>
    </p>
    <p class="text-sm text-gray-600">
      Direct access to <code>proxy.accounts.id.*</code> still works for cases the
      helpers don't cover. Note this pattern requires you to manage init-once
      yourself if the component remounts.
    </p>
    <div ref="buttonRef" />
    <div v-if="credential" class="p-3 bg-green-50 rounded text-xs">
      Signed in (credential length: {{ credential.length }})
    </div>
  </div>
</template>
