<script lang="ts" setup>
import type { CredentialResponse } from '#nuxt-scripts/registry/google-sign-in'
import { useHead, useScriptGoogleSignIn } from '#imports'

useHead({ title: 'Google Sign-In' })

// New helper API: schema options are passed once and reused by initialize/renderButton/prompt.
const { status, initialize, renderButton, prompt, onLoaded } = useScriptGoogleSignIn({
  // clientId comes from runtimeConfig.public.scripts.googleSignIn.clientId by default
  context: 'signin',
  cancelOnTapOutside: true,
  useFedcmForPrompt: true,
})

const buttonRef = useTemplateRef<HTMLDivElement>('buttonRef')
const user = ref<{ name?: string, email?: string, picture?: string, sub?: string } | null>(null)
const credential = ref<string | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)
const momentInfo = ref('')
const oneTapShown = ref(false)

function decodeJwt(token: string) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const json = decodeURIComponent(
    atob(base64).split('').map(c => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`).join(''),
  )
  return JSON.parse(json)
}

function handleCredential(response: CredentialResponse) {
  loading.value = true
  error.value = null
  credential.value = response.credential
  try {
    const decoded = decodeJwt(response.credential)
    user.value = { name: decoded.name, email: decoded.email, picture: decoded.picture, sub: decoded.sub }
  }
  catch (e) {
    error.value = 'Failed to decode credential'
    console.error(e)
  }
  finally {
    loading.value = false
  }
}

// Single initialize call: provides the runtime callback. Safe to call from
// multiple components — internally guarded to run once per page lifecycle.
initialize({ callback: handleCredential })

// Render whenever the target element resolves; safe across navigation.
watch(buttonRef, (el) => {
  if (el) {
    renderButton(el, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      use_fedcm: true,
    })
  }
}, { immediate: true })

function showOneTap() {
  oneTapShown.value = true
  prompt((notification) => {
    if (notification.isDisplayMoment()) {
      momentInfo.value = notification.isDisplayed()
        ? 'One Tap displayed'
        : `Not displayed: ${notification.getNotDisplayedReason()}`
    }
    else if (notification.isSkippedMoment()) {
      momentInfo.value = `Skipped: ${notification.getSkippedReason()}`
    }
    else if (notification.isDismissedMoment()) {
      momentInfo.value = `Dismissed: ${notification.getDismissedReason()}`
    }
  })
}

function signOut() {
  user.value = null
  credential.value = null
  error.value = null
  momentInfo.value = ''
  oneTapShown.value = false
  // disableAutoSelect to prevent auto re-auth next time
  onLoaded(({ accounts }) => accounts.id.disableAutoSelect())
}

function revokeAccess() {
  if (!user.value?.sub)
    return
  loading.value = true
  onLoaded(({ accounts }) => {
    accounts.id.revoke(user.value!.sub!, (response) => {
      loading.value = false
      if (response.successful)
        signOut()
      else
        error.value = `Revocation failed: ${response.error}`
    })
  })
}
</script>

<template>
  <div>
    <ClientOnly>
      <div class="space-y-6">
        <div>
          Script status: <strong id="status">{{ status }}</strong>
        </div>

        <div class="flex flex-wrap gap-2 text-sm">
          <NuxtLink to="/third-parties/google-sign-in/navigation" class="underline">
            Navigation test
          </NuxtLink>
          <NuxtLink to="/third-parties/google-sign-in/locale" class="underline">
            Locale test
          </NuxtLink>
          <NuxtLink to="/third-parties/google-sign-in/redirect-mode" class="underline">
            Redirect mode
          </NuxtLink>
          <NuxtLink to="/third-parties/google-sign-in/proxy-legacy" class="underline">
            Legacy proxy API
          </NuxtLink>
        </div>

        <div v-if="error" class="p-4 bg-red-100 text-red-700 rounded">
          {{ error }}
        </div>

        <div v-if="user" class="p-6 bg-green-50 rounded-lg border border-green-200">
          <div class="flex items-start gap-4">
            <img v-if="user.picture" :src="user.picture" alt="Profile" class="w-16 h-16 rounded-full">
            <div class="flex-1">
              <h3 class="text-lg font-semibold">
                Welcome, {{ user.name }}!
              </h3>
              <p class="text-sm text-gray-600">
                {{ user.email }}
              </p>
              <p class="text-xs text-gray-500 mt-1">
                User ID: {{ user.sub }}
              </p>
            </div>
          </div>
          <div class="mt-4 space-x-2">
            <UButton size="sm" @click="signOut">
              Sign Out
            </UButton>
            <UButton :loading="loading" variant="outline" size="sm" color="red" @click="revokeAccess">
              Revoke Access
            </UButton>
          </div>
        </div>

        <div v-else class="space-y-4">
          <div>
            <h3 class="text-lg font-semibold mb-3">
              Personalized Button
            </h3>
            <div ref="buttonRef" />
          </div>
          <div>
            <h3 class="text-lg font-semibold mb-3">
              One Tap
            </h3>
            <UButton :disabled="oneTapShown" @click="showOneTap">
              Show One Tap Prompt
            </UButton>
            <p v-if="momentInfo" class="text-sm text-gray-600 mt-2">
              {{ momentInfo }}
            </p>
          </div>
        </div>

        <details v-if="credential" class="mt-4">
          <summary class="cursor-pointer text-sm text-gray-600">Show JWT Token</summary>
          <pre class="mt-2 p-4 bg-gray-100 rounded text-xs overflow-x-auto">{{ credential }}</pre>
        </details>
      </div>
    </ClientOnly>
  </div>
</template>
