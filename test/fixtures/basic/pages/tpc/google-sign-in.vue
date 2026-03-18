<script lang="ts" setup>
import { ref } from 'vue'
import { useHead, useScriptGoogleSignIn } from '#imports'

useHead({
  title: 'Google Sign-In',
})

// Google's test client ID
const CLIENT_ID = '1035629894173-c0rpj3bqmcgsi8r8r08hh0kej3cpmikv.apps.googleusercontent.com'

const { status, onLoaded } = useScriptGoogleSignIn({ clientId: CLIENT_ID })

const signedIn = ref(false)
const userEmail = ref<string | null>(null)
const buttonRendered = ref(false)

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
  signedIn.value = true
  const decoded = decodeJwtResponse(response.credential)
  userEmail.value = decoded.email
}

// Initialize when script loads
onLoaded(({ accounts }) => {
  accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: handleCredentialResponse,
  })

  const buttonDiv = document.getElementById('buttonDiv')
  if (buttonDiv) {
    accounts.id.renderButton(buttonDiv, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
    })
    buttonRendered.value = true
  }
})
</script>

<template>
  <div>
    <ClientOnly>
      <div id="status">
        {{ status }}
      </div>
    </ClientOnly>
    <div id="buttonDiv" />
    <div v-if="buttonRendered" id="button-rendered">
      true
    </div>
    <div v-if="signedIn" id="signed-in">
      true
    </div>
    <div v-if="userEmail" id="user-email">
      {{ userEmail }}
    </div>
  </div>
</template>
