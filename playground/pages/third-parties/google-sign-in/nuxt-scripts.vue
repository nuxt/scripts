<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useHead, useScriptGoogleSignIn, useRuntimeConfig } from '#imports'

useHead({
  title: 'Google Sign-In',
})

const config = useRuntimeConfig()
const clientId = config.public.scripts.googleSignIn.clientId

const { status, onLoaded } = useScriptGoogleSignIn()

const user = ref<{
  name?: string
  email?: string
  picture?: string
  sub?: string
} | null>(null)
const credential = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const oneTapShown = ref(false)
const momentInfo = ref<string>('')

// Decode JWT token (simple base64 decode, not cryptographically verified)
function decodeJwtResponse(token: string) {
  const base64Url = token.split('.')[1]
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  )
  return JSON.parse(jsonPayload)
}

function handleCredentialResponse(response: any) {
  loading.value = true
  error.value = null
  credential.value = response.credential

  try {
    const decoded = decodeJwtResponse(response.credential)
    user.value = {
      name: decoded.name,
      email: decoded.email,
      picture: decoded.picture,
      sub: decoded.sub,
    }
  }
  catch (e) {
    error.value = 'Failed to decode credential'
    console.error(e)
  }
  finally {
    loading.value = false
  }
}

// Initialize Google Sign-In
onMounted(() => {
  onLoaded(({ accounts }) => {
    // Initialize with configuration
    accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      ux_mode: 'popup',
      use_fedcm_for_prompt: true, // Use Privacy Sandbox FedCM API when available
    })

    // Render the personalized button
    const buttonDiv = document.getElementById('buttonDiv')
    if (buttonDiv) {
      accounts.id.renderButton(buttonDiv, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
      })
    }
  })
})

function showOneTap() {
  onLoaded(({ accounts }) => {
    accounts.id.prompt((notification) => {
      oneTapShown.value = true

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
  })
}

function signOut() {
  user.value = null
  credential.value = null
  error.value = null
  momentInfo.value = ''
  oneTapShown.value = false

  // Disable auto-select for next time
  onLoaded(({ accounts }) => {
    accounts.id.disableAutoSelect()
  })
}

function revokeAccess() {
  if (!user.value?.sub) return

  loading.value = true
  onLoaded(({ accounts }) => {
    accounts.id.revoke(user.value!.sub!, (response) => {
      loading.value = false
      if (response.successful) {
        signOut()
      }
      else {
        error.value = `Revocation failed: ${response.error}`
      }
    })
  })
}
</script>

<template>
  <div>
    <ClientOnly>
      <div class="space-y-6">
        <!-- Status -->
        <div>
          Script status: <strong id="status">{{ status }}</strong>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="p-4 bg-red-100 text-red-700 rounded">
          {{ error }}
        </div>

        <!-- User Profile (when signed in) -->
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

        <!-- Sign-In Options (when not signed in) -->
        <div v-else class="space-y-4">
          <div>
            <h3 class="text-lg font-semibold mb-3">
              Option 1: Personalized Button
            </h3>
            <div id="buttonDiv" />
          </div>

          <div>
            <h3 class="text-lg font-semibold mb-3">
              Option 2: One Tap
            </h3>
            <UButton :disabled="oneTapShown" @click="showOneTap">
              Show One Tap Prompt
            </UButton>
            <p v-if="momentInfo" class="text-sm text-gray-600 mt-2">
              {{ momentInfo }}
            </p>
          </div>
        </div>

        <!-- Credential Display (for debugging) -->
        <details v-if="credential" class="mt-4">
          <summary class="cursor-pointer text-sm text-gray-600">
            Show JWT Token
          </summary>
          <pre class="mt-2 p-4 bg-gray-100 rounded text-xs overflow-x-auto">{{ credential }}</pre>
        </details>

        <!-- Documentation -->
        <div class="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 class="font-semibold mb-2">
            About Google Sign-In
          </h3>
          <ul class="text-sm space-y-1 text-gray-700">
            <li>✅ Async + defer script loading for optimal performance</li>
            <li>✅ One Tap for quick authentication</li>
            <li>✅ Personalized button with Google branding</li>
            <li>✅ FedCM API support (Privacy Sandbox)</li>
            <li>✅ Full TypeScript types for the GIS API</li>
          </ul>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>
