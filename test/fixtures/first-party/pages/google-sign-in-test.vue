<script lang="ts" setup>
import { useHead, useScriptGoogleSignIn } from '#imports'

useHead({ title: 'Google Sign-In - First Party' })
const { status } = useScriptGoogleSignIn({ clientId: '000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com' })
</script>

<template>
  <div>
    <h1>Google Sign-In First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <p>GSI library loads. With a dummy clientId, the One Tap prompt won't appear but the SDK initializes.</p>
  </div>
</template>
