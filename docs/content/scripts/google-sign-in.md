---
title: Google Sign-In
description: Add Google Sign-In to your Nuxt app with One Tap and personalized button support.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/google-sign-in.ts
  size: xs
- label: Google Identity Services
  icon: i-simple-icons-google
  to: https://developers.google.com/identity/gsi/web/guides/overview
  size: xs
---

[Google Sign-In](https://developers.google.com/identity/gsi/web) supports One Tap, personalized buttons, and automatic sign-in with a Google Account.

[`useScriptGoogleSignIn()`{lang="ts"}](/scripts/google-sign-in){lang="ts"} loads Google Identity Services and adds helpers for initialization, buttons, and One Tap prompts.

::script-stats
::

::script-docs{:sections='["setup", "composable"]'}
::

## Live demo

::google-sign-in-demo
::

## Composable API

`useScriptGoogleSignIn()`{lang="ts"} returns the standard script context (`status`, `proxy`, `onLoaded`, …) plus three helpers that wrap the most common flows. Every helper call merges schema options passed to the composable, so you don't have to repeat `clientId`, `loginUri`, `uxMode`, and related options.

```ts
const { initialize, renderButton, prompt, status, onLoaded, proxy } = useScriptGoogleSignIn({
  clientId: 'YOUR_CLIENT_ID',
  context: 'signin',
})
```

### `initialize(config?)`{lang="ts"}

Calls `google.accounts.id.initialize()`{lang="ts"} with schema options merged with `config`. The helper only forwards the first call, which follows Google's guidance to [initialize once per page](https://developers.google.com/identity/gsi/web/reference/js-reference#method_google.accounts.id.initialize) and keeps remounts from resetting the active configuration.

```ts
initialize({
  callback: (response) => {
    // verify response.credential server-side
  }
})
```

### `renderButton(parent, config?)`{lang="ts"}

Renders the personalized button and is safe to re-render on locale change or navigation. If Google Identity Services has not initialized yet, the helper tries to initialize it from the configured options. Popup mode requires a callback, supplied either to the composable or through `initialize({ callback })`{lang="ts"}; without one, `renderButton()`{lang="ts"} returns without rendering. Redirect mode can initialize without a callback.

```vue
<script setup lang="ts">
const { initialize, renderButton } = useScriptGoogleSignIn()
const buttonRef = useTemplateRef<HTMLDivElement>('buttonRef')

initialize({
  callback: response => console.log('Credential received', response),
})

watch(buttonRef, (el) => {
  if (el)
    renderButton(el, { text: 'continue_with' })
}, { immediate: true })
</script>

<template>
  <div ref="buttonRef" />
</template>
```

### `prompt(listener?)`{lang="ts"}

Shows the One Tap prompt. In popup mode, call `initialize({ callback })`{lang="ts"} first (or pass the callback to the composable); otherwise initialization is deferred and `prompt()`{lang="ts"} returns without showing One Tap.

```ts
prompt()
```

### Switching locales

The button [locale is a `renderButton` option](https://developers.google.com/identity/gsi/web/reference/js-reference#locale), not an `initialize` one. To change the language, clear the container and re-render:

```ts
watch([locale, buttonRef], ([newLocale, el]) => {
  if (!el)
    return
  el.innerHTML = ''
  renderButton(el, { locale: newLocale })
}, { immediate: true })
```

### Redirect UX mode

With `uxMode: 'redirect'`, Google **POSTs** the credential to your `loginUri` server endpoint as `application/x-www-form-urlencoded` (fields: `credential`, `g_csrf_token`, `select_by`, …). The credential does **not** appear as a URL fragment after the redirect; it travels in the POST body, which your server handles before redirecting the browser. Validate the [double-submit CSRF token](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token#verify_the_cross-site_request_forgery_csrf_token) before accepting the credential.

If you need the credential client-side (e.g. SPA with a separate API), use `uxMode: 'popup'` with a `callback` instead.

```ts
const { initialize, renderButton } = useScriptGoogleSignIn({
  uxMode: 'redirect',
  loginUri: 'https://your-server.com/auth/google',
})

initialize() // no callback needed in redirect mode
```

## Moment notifications

With FedCM, Google removes display-moment notifications and the detailed skipped reason. Google also warns that the prompt callback might not receive every moment notification, so do not make application flow depend on it. If you inspect the remaining skipped and dismissed moments, avoid the removed methods:

```ts
const { initialize, prompt } = useScriptGoogleSignIn()

initialize({
  callback: response => console.log('Credential received', response),
})
prompt((notification) => {
  if (notification.isSkippedMoment()) {
    console.log('One Tap skipped')
  }

  if (notification.isDismissedMoment()) {
    console.log('Dismissed:', notification.getDismissedReason())
  }
})
```

See Google's [FedCM migration guide](https://developers.google.com/identity/gsi/web/guides/fedcm-migration#remove_use_of_isdisplaymoment_isdisplayed_isnotdisplayed_and_getnotdisplayedreason_methods) for the removed methods and notification limitations.

## Server-side verification

Always [verify the credential token on your server](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token). Google's [Node.js authentication library](https://github.com/googleapis/google-auth-library-nodejs) checks the signature and the `aud`, `iss`, and `exp` claims:

```bash
pnpm add google-auth-library
```

```ts [server/api/auth/google.post.ts]
import { OAuth2Client } from 'google-auth-library'

const client = new OAuth2Client()

export default defineEventHandler(async (event) => {
  const { credential } = await readBody(event)

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: 'YOUR_CLIENT_ID',
  })
  const payload = ticket.getPayload()
  if (!payload) {
    throw createError({ statusCode: 401, message: 'Invalid token' })
  }

  const user = {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    sub: payload.sub,
  }

  return { user }
})
```

## Cross-Origin-Opener-Policy

Non-FedCM `popup` flows may require a compatible `Cross-Origin-Opener-Policy` so the popup can communicate with your page.

If you set COOP at all, use `same-origin-allow-popups`:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  routeRules: {
    '/login/**': {
      headers: { 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' },
    },
  },
})
```

Google's [COOP setup guidance](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#cross_origin_opener_policy) applies this header when you disable FedCM. Browser-rendered FedCM popups and redirect mode do not need it.

## FedCM API support

Google now marks `use_fedcm_for_prompt` as [deprecated and ignored](https://developers.google.com/identity/gsi/web/reference/js-reference#use_fedcm_for_prompt). The registry's `useFedcmForPrompt` option still maps to that field, so changing it has no effect. Button FedCM uses `use_fedcm_for_button`, which this registry does not currently map.

### Cross-origin iframes

For [supported same-site cross-origin iframe integrations](https://developers.google.com/identity/gsi/web/guides/fedcm-migration#add_allowidentity-credentials-get_attribute_to_parent_frame_if_your_web_app_calls_one_tap_or_button_api_from_cross-origin_iframes), add the `allow` attribute to every parent iframe:

```html
<iframe src="https://your-app.com/login" allow="identity-credentials-get"></iframe>
```

::warning
With FedCM enabled, customizing the One Tap prompt position with `prompt_parent_id` is not supported. Google does not support One Tap in cross-site iframes.
::

## Revoking Sign in with Google consent

Use an email address or Google user ID as the hint when [revoking Sign in with Google consent](https://developers.google.com/identity/gsi/web/guides/revoke):

```ts
const { onLoaded } = useScriptGoogleSignIn()

function revokeAccess(hint: string) {
  onLoaded(({ accounts }) => {
    accounts.id.revoke(hint, (response) => {
      if (response.successful) {
        console.log('Access revoked')
      }
      else {
        console.error('Revocation failed:', response.error)
      }
    })
  })
}
```

## Best practices

### Logout handling

If you enable automatic sign-in, call [`disableAutoSelect()`{lang="ts"} when the user signs out](https://developers.google.com/identity/gsi/web/guides/automatic-sign-in-sign-out#sign-out). This prevents the same account from immediately signing in again:

```ts
function signOut() {
  // Clear your app's session
  user.value = null

  // Prevent One Tap from auto-selecting this account
  onLoaded(({ accounts }) => {
    accounts.id.disableAutoSelect()
  })
}
```

### Hosted domain restriction

Use `hd` to optimize the sign-in flow for a Google Workspace domain:

```ts
const { initialize } = useScriptGoogleSignIn({
  hd: 'your-company.com',
})

initialize({ callback: handleCredentialResponse })
```

The client-side `hd` option is not an authorization check. [Verify the ID token's `hd` claim](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token) on your server before restricting access to the domain.

## Local development setup

To test Google Sign-In locally:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create or select an OAuth 2.0 Client ID (Web application type)
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000` (or your exact dev server origin)
4. Save and copy your Client ID

::note
Add the exact development origin, including its scheme and port. You don't need a redirect URI when using popup mode.
::

Then configure your environment:

```bash [.env]
NUXT_PUBLIC_SCRIPTS_GOOGLE_SIGN_IN_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## Guides

::note
See [Google's setup guide](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) to create a client ID and configure the OAuth consent screen.
::

::script-types
::

## Example

### One Tap sign-in

Initialize Google Identity Services, then open the One Tap prompt:

```vue
<script setup lang="ts">
const { initialize, prompt } = useScriptGoogleSignIn({
  context: 'signin',
})

async function handleCredentialResponse(response: CredentialResponse) {
  await $fetch('/api/auth/google', {
    method: 'POST',
    body: { credential: response.credential }
  })
}

initialize({ callback: handleCredentialResponse })
onMounted(() => prompt())
</script>
```

### Personalized Button

Render a personalized Sign in with Google button:

```vue
<script setup lang="ts">
const { initialize, renderButton } = useScriptGoogleSignIn()
const buttonRef = useTemplateRef<HTMLDivElement>('buttonRef')

function handleCredentialResponse(response: CredentialResponse) {
  console.log('Signed in!', response.credential)
}

initialize({ callback: handleCredentialResponse })

watch(buttonRef, (el) => {
  if (el) {
    renderButton(el, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
    })
  }
}, { immediate: true })
</script>

<template>
  <div ref="buttonRef" />
</template>
```
