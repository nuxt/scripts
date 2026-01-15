<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'

const config = useRuntimeConfig()
const clientId = computed(() => config.public?.scripts?.googleSignIn?.clientId)

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
const momentInfo = ref<string>('')
const showToken = ref(false)

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

  const decoded = decodeJwtResponse(response.credential)
  user.value = {
    name: decoded.name,
    email: decoded.email,
    picture: decoded.picture,
    sub: decoded.sub,
  }
  loading.value = false
}

onMounted(() => {
  if (!clientId.value)
    return

  onLoaded(({ accounts }) => {
    accounts.id.initialize({
      client_id: clientId.value,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      ux_mode: 'popup',
      use_fedcm_for_prompt: true,
    })

    const buttonDiv = document.getElementById('g-signin-demo-button')
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
  momentInfo.value = ''
  onLoaded(({ accounts }) => {
    accounts.id.prompt((notification) => {
      if (notification.isDisplayMoment()) {
        momentInfo.value = notification.isDisplayed()
          ? '✓ One Tap displayed'
          : `✗ Not displayed: ${notification.getNotDisplayedReason()}`
      }
      else if (notification.isSkippedMoment()) {
        momentInfo.value = `⊘ Skipped: ${notification.getSkippedReason()}`
      }
      else if (notification.isDismissedMoment()) {
        momentInfo.value = `○ Dismissed: ${notification.getDismissedReason()}`
      }
    })
  })
}

function signOut() {
  user.value = null
  credential.value = null
  error.value = null
  momentInfo.value = ''
  showToken.value = false

  onLoaded(({ accounts }) => {
    accounts.id.disableAutoSelect()
  })
}

function revokeAccess() {
  if (!user.value?.sub)
    return

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

const statusColor = computed(() => {
  if (status.value === 'loaded') return 'success'
  if (status.value === 'loading') return 'warning'
  return 'neutral'
})
</script>

<template>
  <div class="not-prose">
    <!-- No Client ID configured -->
    <UAlert
      v-if="!clientId"
      color="warning"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      title="Demo unavailable"
      description="No Google Client ID configured. Set NUXT_PUBLIC_SCRIPTS_GOOGLE_SIGN_IN_CLIENT_ID to enable the live demo."
    />

    <!-- Demo Card -->
    <UCard v-else>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">Live Demo</span>
          <UBadge :color="statusColor" variant="subtle" size="sm">
            {{ status }}
          </UBadge>
        </div>
      </template>

      <!-- Error Display -->
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        :title="error"
        class="mb-4"
        close
        @update:open="error = null"
      />

      <!-- Signed In State -->
      <div v-if="user" class="space-y-4">
        <div class="flex items-center gap-4">
          <UAvatar
            v-if="user.picture"
            :src="user.picture"
            :alt="user.name"
            size="lg"
          />
          <div class="min-w-0 flex-1">
            <p class="font-medium truncate">
              {{ user.name }}
            </p>
            <p class="text-sm text-muted truncate">
              {{ user.email }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton size="sm" @click="signOut">
            Sign Out
          </UButton>
          <UButton
            size="sm"
            color="neutral"
            variant="subtle"
            :loading="loading"
            @click="revokeAccess"
          >
            Revoke Access
          </UButton>
        </div>

        <!-- JWT Token Viewer -->
        <UCollapsible v-if="credential" v-model:open="showToken" class="mt-4">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            :trailing-icon="showToken ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            class="w-full justify-between"
          >
            <span class="font-mono text-xs">JWT Token</span>
          </UButton>
          <template #content>
            <pre class="mt-2 p-3 bg-elevated rounded text-xs overflow-x-auto max-h-32">{{ credential }}</pre>
          </template>
        </UCollapsible>
      </div>

      <!-- Signed Out State -->
      <div v-else class="space-y-4">
        <div>
          <p class="text-sm text-muted mb-3">
            Sign in with your Google account:
          </p>
          <div id="g-signin-demo-button" class="max-w-[240px]" />
          <p class="text-xs text-muted mt-2">
            Or
          </p>
        </div>

        <div>
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            icon="i-lucide-pointer"
            @click="showOneTap"
          >
            Try One Tap
          </UButton>
          <p v-if="momentInfo" class="text-sm mt-2" :class="momentInfo.startsWith('✓') ? 'text-success' : 'text-muted'">
            {{ momentInfo }}
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>
