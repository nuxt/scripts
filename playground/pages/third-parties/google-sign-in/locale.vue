<script lang="ts" setup>
import type { CredentialResponse } from '#nuxt-scripts/registry/google-sign-in'
import { useHead, useScriptGoogleSignIn } from '#imports'

useHead({ title: 'Google Sign-In · Locale' })

// Repro for: "I pass the i18n locale but the language is weird".
// Locale is a per-renderButton option; switching it requires a re-render.
const { initialize, renderButton } = useScriptGoogleSignIn({
  context: 'signin',
})

const locales = ['en', 'fr', 'de', 'es', 'ja', 'pt-BR']
const locale = ref<string>('en')
const buttonRef = useTemplateRef<HTMLDivElement>('buttonRef')
const lastCredential = ref<string | null>(null)

initialize({
  callback: (r: CredentialResponse) => {
    lastCredential.value = r.credential
  },
})

// Re-render button when locale or template ref changes.
watch([locale, buttonRef], ([newLocale, el]) => {
  if (!el)
    return
  // Clear previous render so Google rebuilds with the new locale.
  el.innerHTML = ''
  renderButton(el, {
    text: 'continue_with',
    locale: newLocale,
    use_fedcm: true,
  })
}, { immediate: true })
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold">
      Locale switch test
    </h1>
    <p class="text-sm text-gray-600">
      Locale is a button option; rendering with a new locale requires clearing
      the container and calling <code>renderButton</code> again. Note: Google
      may fall back to the user's account language regardless of this value.
    </p>
    <div class="flex gap-2">
      <button
        v-for="l in locales"
        :key="l"
        type="button"
        class="px-3 py-1 border rounded text-sm"
        :class="locale === l ? 'bg-blue-600 text-white' : 'bg-white'"
        @click="locale = l"
      >
        {{ l }}
      </button>
    </div>
    <div ref="buttonRef" />
    <div v-if="lastCredential" class="p-3 bg-green-50 rounded text-xs">
      Signed in
    </div>
  </div>
</template>
