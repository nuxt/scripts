<script lang="ts" setup>
import { useHead, useScriptGoogleSignIn } from '#imports'

useHead({ title: 'Google Sign-In · Redirect mode' })

// Demonstrates ux_mode: 'redirect'. Google does NOT add the client_id as a URL
// fragment — instead the credential is POSTed to the loginUri server endpoint
// as application/x-www-form-urlencoded with fields { credential, g_csrf_token,
// select_by, ... }. Validate it server-side.
const { initialize, renderButton, status } = useScriptGoogleSignIn({
  uxMode: 'redirect',
  loginUri: typeof window !== 'undefined' ? `${window.location.origin}/api/_playground/google-sign-in-redirect` : undefined,
})

const buttonRef = useTemplateRef<HTMLDivElement>('buttonRef')

// No callback: in redirect mode Google ignores it and POSTs to login_uri.
initialize()

watch(buttonRef, (el) => {
  if (el)
    renderButton(el, { text: 'continue_with', use_fedcm: true })
}, { immediate: true })
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold">
      Redirect mode
    </h1>
    <p class="text-sm text-gray-600">
      Status: <strong>{{ status }}</strong>
    </p>
    <div class="p-4 bg-amber-50 border border-amber-200 rounded text-sm space-y-2">
      <p>
        With <code>uxMode: 'redirect'</code>, Google POSTs the credential to your
        <code>loginUri</code> server endpoint. The browser is then redirected to
        that URL — no <code>client_id</code> appears in the URL fragment because
        the credential travels in the POST body.
      </p>
      <p>
        For client-side flows (e.g. Nuxt SPA with a separate API), use
        <code>uxMode: 'popup'</code> with a <code>callback</code> instead.
      </p>
    </div>
    <div ref="buttonRef" />
  </div>
</template>
