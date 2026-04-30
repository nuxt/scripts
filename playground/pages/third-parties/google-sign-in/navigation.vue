<script lang="ts" setup>
import type { CredentialResponse } from '#nuxt-scripts/registry/google-sign-in'
import { useHead, useScriptGoogleSignIn } from '#imports'

useHead({ title: 'Google Sign-In · Navigation' })

// Repro for: "Initialize have to be called only once or it displays an error
// message upon navigation". The helper is internally guarded so calling
// `initialize()` from a component that re-mounts is safe.
const { initialize, renderButton, status } = useScriptGoogleSignIn({
  context: 'signin',
  useFedcmForPrompt: true,
})

const buttonRef = useTemplateRef<HTMLDivElement>('buttonRef')
const lastSignIn = ref<string | null>(null)
const initCount = ref(0)

initialize({
  callback: (r: CredentialResponse) => {
    lastSignIn.value = r.credential
  },
})
initCount.value++

watch(buttonRef, (el) => {
  if (el)
    renderButton(el, { text: 'continue_with', use_fedcm: true })
}, { immediate: true })
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold">
      Navigation re-mount test
    </h1>
    <p class="text-sm text-gray-600">
      Click the links below to navigate away and back. The button should keep
      rendering without console errors. The composable's <code>initialize()</code>
      is guarded so multiple calls (across mounts) become a no-op.
    </p>
    <div class="text-sm">
      Status: <strong>{{ status }}</strong> · initialize() called this mount: <strong>{{ initCount }}</strong>
    </div>
    <div class="flex gap-2 text-sm">
      <NuxtLink to="/third-parties/google-sign-in/nuxt-scripts" class="underline">
        Main demo
      </NuxtLink>
      <NuxtLink to="/third-parties/google-sign-in/locale" class="underline">
        Locale
      </NuxtLink>
    </div>
    <div ref="buttonRef" />
    <div v-if="lastSignIn" class="p-3 bg-green-50 rounded text-xs">
      Signed in (credential length: {{ lastSignIn.length }})
    </div>
  </div>
</template>
