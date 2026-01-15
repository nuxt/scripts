---
title: Google Sign-In
description: Add Google Sign-In to your Nuxt app with One Tap and personalized button support.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/google-sign-in.ts
  size: xs
- label: Google Identity Services
  icon: i-simple-icons-google
  to: https://developers.google.com/identity/gsi/web/guides/overview
  size: xs
---

[Google Sign-In](https://developers.google.com/identity/gsi/web) provides a secure and convenient way for users to sign in to your app using their Google Account with One Tap, personalized buttons, and automatic sign-in.

Nuxt Scripts provides a registry script composable `useScriptGoogleSignIn` to easily integrate Google Sign-In in your Nuxt app with optimal performance.

## Live Demo

::google-sign-in-demo
::

## Performance Optimizations

The script is loaded with `async` and `defer` attributes to prevent render-blocking, ensuring optimal Core Web Vitals. The initialization is deferred until you explicitly call `initialize()`, giving you full control over when One Tap appears.

## Nuxt Config Setup

The simplest way to load Google Sign-In globally in your Nuxt App is to use Nuxt config. Alternatively you can directly use the [useScriptGoogleSignIn](#usescriptgooglesignin) composable.

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleSignIn: {
        clientId: 'YOUR_GOOGLE_CLIENT_ID'
      }
    }
  }
})
```

```ts [Production only]
export default defineNuxtConfig({
  $production: {
    scripts: {
      registry: {
        googleSignIn: {
          clientId: 'YOUR_GOOGLE_CLIENT_ID'
        }
      }
    }
  }
})
```

::

### With Environment Variables

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleSignIn: true,
    }
  },
  runtimeConfig: {
    public: {
      scripts: {
        googleSignIn: {
          clientId: '', // NUXT_PUBLIC_SCRIPTS_GOOGLE_SIGN_IN_CLIENT_ID
        },
      },
    },
  },
})
```

## useScriptGoogleSignIn

The `useScriptGoogleSignIn` composable lets you have fine-grained control over when and how you load Google Sign-In.

```ts
const { onLoaded } = useScriptGoogleSignIn({
  clientId: 'YOUR_GOOGLE_CLIENT_ID'
})

// Initialize when ready
onLoaded(({ accounts }) => {
  accounts.id.initialize({
    client_id: 'YOUR_GOOGLE_CLIENT_ID',
    callback: handleCredentialResponse
  })
})
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### GoogleSignInApi

```ts
export interface GoogleSignInApi {
  accounts: {
    id: {
      initialize: (config: IdConfiguration) => void
      prompt: (momentListener?: (notification: MomentNotification) => void) => void
      renderButton: (parent: HTMLElement, options: GsiButtonConfiguration) => void
      disableAutoSelect: () => void
      cancel: () => void
      revoke: (hint: string, callback: (response: RevocationResponse) => void) => void
    }
  }
}
```

### Config Schema

You can configure the Google Sign-In script with the following options:

```ts
export const GoogleSignInOptions = object({
  clientId: string(),
  autoSelect: optional(boolean()),
  context: optional(union([literal('signin'), literal('signup'), literal('use')])),
  useFedcmForPrompt: optional(boolean()),
  cancelOnTapOutside: optional(boolean()),
  uxMode: optional(union([literal('popup'), literal('redirect')])),
  loginUri: optional(string()),
  itpSupport: optional(boolean()),
  allowedParentOrigin: optional(union([string(), array(string())])),
  hd: optional(string()), // Restrict to Google Workspace domain
})
```

## Example

### One Tap Sign-In

The One Tap prompt provides a streamlined sign-in experience:

```vue
<script setup lang="ts">
const { onLoaded } = useScriptGoogleSignIn()

function handleCredentialResponse(response: CredentialResponse) {
  // Send the credential to your backend for verification
  await $fetch('/api/auth/google', {
    method: 'POST',
    body: { credential: response.credential }
  })
}

onMounted(() => {
  onLoaded(({ accounts }) => {
    accounts.id.initialize({
      client_id: 'YOUR_CLIENT_ID',
      callback: handleCredentialResponse,
      context: 'signin',
      ux_mode: 'popup',
      use_fedcm_for_prompt: true // Use Privacy Sandbox FedCM API
    })
    
    // Show One Tap
    accounts.id.prompt()
  })
})
</script>
```

### Personalized Button

Render Google's personalized Sign in with Google button:

```vue
<script setup lang="ts">
const { onLoaded } = useScriptGoogleSignIn()

function handleCredentialResponse(response: CredentialResponse) {
  console.log('Signed in!', response.credential)
}

onMounted(() => {
  onLoaded(({ accounts }) => {
    accounts.id.initialize({
      client_id: 'YOUR_CLIENT_ID',
      callback: handleCredentialResponse
    })
    
    const buttonDiv = document.getElementById('g-signin-button')
    if (buttonDiv) {
      accounts.id.renderButton(buttonDiv, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left'
      })
    }
  })
})
</script>

<template>
  <div id="g-signin-button" />
</template>
```

## Moment Notifications

Track the One Tap display state:

```ts
const { onLoaded } = useScriptGoogleSignIn()

onLoaded(({ accounts }) => {
  accounts.id.prompt((notification) => {
    if (notification.isDisplayMoment()) {
      if (notification.isDisplayed()) {
        console.log('One Tap displayed')
      } else {
        console.log('Not displayed:', notification.getNotDisplayedReason())
      }
    }
    
    if (notification.isSkippedMoment()) {
      console.log('Skipped:', notification.getSkippedReason())
    }
    
    if (notification.isDismissedMoment()) {
      console.log('Dismissed:', notification.getDismissedReason())
    }
  })
})
```

## Server-Side Verification

Always verify the credential token on your server:

```ts [server/api/auth/google.post.ts]
export default defineEventHandler(async (event) => {
  const { credential } = await readBody(event)
  
  // Verify the token with Google
  const response = await $fetch(`https://oauth2.googleapis.com/tokeninfo`, {
    params: { id_token: credential }
  })
  
  // Verify the client ID matches
  if (response.aud !== 'YOUR_CLIENT_ID') {
    throw createError({ statusCode: 401, message: 'Invalid token' })
  }
  
  // Create session with user info
  const user = {
    email: response.email,
    name: response.name,
    picture: response.picture,
    sub: response.sub
  }
  
  return { user }
})
```

## FedCM API Support

Enable Privacy Sandbox [FedCM API](https://developers.google.com/identity/gsi/web/guides/fedcm-migration) support for enhanced privacy. **FedCM adoption becomes mandatory in August 2025.**

```ts
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleSignIn: {
        clientId: 'YOUR_CLIENT_ID',
        useFedcmForPrompt: true
      }
    }
  }
})
```

### Cross-Origin Iframes

When using One Tap or the Sign-In button in cross-origin iframes with FedCM, add the `allow` attribute to all parent iframes:

```html
<iframe src="https://your-app.com/login" allow="identity-credentials-get"></iframe>
```

::warning
With FedCM enabled, customizing the One Tap prompt position via `prompt_parent_id` is not supported.
::

## Revoking Access

Allow users to revoke access to their Google Account:

```ts
const { onLoaded } = useScriptGoogleSignIn()

function revokeAccess(userId: string) {
  onLoaded(({ accounts }) => {
    accounts.id.revoke(userId, (response) => {
      if (response.successful) {
        console.log('Access revoked')
      } else {
        console.error('Revocation failed:', response.error)
      }
    })
  })
}
```

## Best Practices

### Logout Handling

Always call `disableAutoSelect()` when the user signs out to prevent automatic re-authentication:

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

### Hosted Domain Restriction

Restrict sign-in to a specific Google Workspace domain:

```ts
accounts.id.initialize({
  client_id: 'YOUR_CLIENT_ID',
  callback: handleCredentialResponse,
  hd: 'your-company.com' // Only allow users from this domain
})
```

## Local Development Setup

To test Google Sign-In locally:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create or select an OAuth 2.0 Client ID (Web application type)
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost`
   - `http://localhost:3000` (or your dev server port)
4. Save and copy your Client ID

::note
Google requires `http://localhost` (not `127.0.0.1`) for local development. No redirect URI is needed when using popup mode.
::

Then configure your environment:

```bash [.env]
NUXT_PUBLIC_SCRIPTS_GOOGLE_SIGN_IN_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## Guides

::note
For more detailed info on how to obtain a Google Client ID and configure your OAuth consent screen, see the official [Google Identity Services documentation](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
::
