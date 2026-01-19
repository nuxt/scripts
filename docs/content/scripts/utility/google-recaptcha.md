---
title: Google reCAPTCHA
description: Use Google reCAPTCHA v3 in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/google-recaptcha.ts
    size: xs
---

[Google reCAPTCHA](https://www.google.com/recaptcha/about/) protects your site from spam and abuse using advanced risk analysis.

Nuxt Scripts provides a registry script composable `useScriptGoogleRecaptcha` to easily integrate reCAPTCHA v3 in your Nuxt app.

::callout
This integration supports reCAPTCHA v3 (score-based, invisible) only. For v2 checkbox, use the standard reCAPTCHA integration.
::

### Loading Globally

::code-group

```ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleRecaptcha: {
        siteKey: 'YOUR_SITE_KEY'
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
        googleRecaptcha: {
          siteKey: 'YOUR_SITE_KEY'
        }
      }
    }
  }
})
```

```ts [Environment Variables]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleRecaptcha: true,
    }
  },
  runtimeConfig: {
    public: {
      scripts: {
        googleRecaptcha: {
          // .env
          // NUXT_PUBLIC_SCRIPTS_GOOGLE_RECAPTCHA_SITE_KEY=<your-key>
          siteKey: '',
        },
      },
    },
  },
})
```

::

## useScriptGoogleRecaptcha

The `useScriptGoogleRecaptcha` composable lets you have fine-grain control over when and how reCAPTCHA is loaded on your site.

```ts
const { proxy } = useScriptGoogleRecaptcha({
  siteKey: 'YOUR_SITE_KEY'
})

// Execute reCAPTCHA and get token
proxy.grecaptcha.ready(async () => {
  const token = await proxy.grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' })
  // Send token to your server for verification
})
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### GoogleRecaptchaApi

```ts
export interface GoogleRecaptchaApi {
  grecaptcha: {
    ready: (callback: () => void) => void
    execute: (siteKey: string, options: { action: string }) => Promise<string>
    enterprise?: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const GoogleRecaptchaOptions = object({
  /**
   * Your reCAPTCHA site key from the Google reCAPTCHA admin console.
   */
  siteKey: string(),
  /**
   * Use reCAPTCHA Enterprise instead of standard reCAPTCHA.
   */
  enterprise: optional(boolean()),
  /**
   * Load from recaptcha.net instead of google.com (works in China).
   */
  recaptchaNet: optional(boolean()),
  /**
   * Language code for the reCAPTCHA widget.
   */
  hl: optional(string()),
})
```

## Example

Using reCAPTCHA v3 to protect a form submission with server-side verification.

::code-group

```vue [ContactForm.vue]
<script setup lang="ts">
const { onLoaded } = useScriptGoogleRecaptcha()

const name = ref('')
const email = ref('')
const message = ref('')
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')

async function onSubmit() {
  status.value = 'loading'

  onLoaded(async ({ grecaptcha }) => {
    // Get reCAPTCHA token
    const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'contact' })

    // Send form data + token to your API for verification
    const result = await $fetch('/api/contact', {
      method: 'POST',
      body: {
        token,
        name: name.value,
        email: email.value,
        message: message.value
      }
    }).catch(() => null)

    status.value = result ? 'success' : 'error'
  })
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <input v-model="name" placeholder="Name" required />
    <input v-model="email" type="email" placeholder="Email" required />
    <textarea v-model="message" placeholder="Message" required />
    <button type="submit" :disabled="status === 'loading'">
      {{ status === 'loading' ? 'Sending...' : 'Submit' }}
    </button>
    <p v-if="status === 'success'">Message sent!</p>
    <p v-if="status === 'error'">Failed to send. Please try again.</p>
  </form>
</template>
```

```ts [server/api/contact.post.ts]
export default defineEventHandler(async (event) => {
  const { token, name, email, message } = await readBody(event)

  // Verify reCAPTCHA token
  const secretKey = process.env.RECAPTCHA_SECRET_KEY
  const verification = await $fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
    }),
  })

  if (!verification.success || verification.score < 0.5) {
    throw createError({
      statusCode: 400,
      message: 'reCAPTCHA verification failed',
    })
  }

  // Process the contact form (send email, save to DB, etc.)
  console.log('Contact form submitted:', { name, email, message, score: verification.score })

  return { success: true }
})
```

::

## Enterprise

For reCAPTCHA Enterprise, set the `enterprise` option to `true`:

```ts
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleRecaptcha: {
        siteKey: 'YOUR_SITE_KEY',
        enterprise: true
      }
    }
  }
})
```

## China Support

For sites that need to work in China, use `recaptchaNet: true` to load from `recaptcha.net` instead of `google.com`:

```ts
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleRecaptcha: {
        siteKey: 'YOUR_SITE_KEY',
        recaptchaNet: true
      }
    }
  }
})
```

## Server-Side Verification

reCAPTCHA tokens must be verified on your server. Create an API endpoint to validate the token:

::code-group

```ts [server/api/verify-recaptcha.post.ts]
export default defineEventHandler(async (event) => {
  const { token } = await readBody(event)
  const secretKey = process.env.RECAPTCHA_SECRET_KEY

  const response = await $fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
    }),
  })

  if (!response.success || response.score < 0.5) {
    throw createError({
      statusCode: 400,
      message: 'reCAPTCHA verification failed',
    })
  }

  return { success: true, score: response.score }
})
```

```ts [Enterprise - server/api/verify-recaptcha.post.ts]
export default defineEventHandler(async (event) => {
  const { token } = await readBody(event)
  const projectId = process.env.RECAPTCHA_PROJECT_ID
  const apiKey = process.env.RECAPTCHA_API_KEY
  const siteKey = process.env.NUXT_PUBLIC_SCRIPTS_GOOGLE_RECAPTCHA_SITE_KEY

  const response = await $fetch(
    `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`,
    {
      method: 'POST',
      body: {
        event: { token, siteKey, expectedAction: 'submit' },
      },
    }
  )

  if (!response.tokenProperties?.valid || response.riskAnalysis?.score < 0.5) {
    throw createError({
      statusCode: 400,
      message: 'reCAPTCHA verification failed',
    })
  }

  return { success: true, score: response.riskAnalysis.score }
})
```

::

::callout{type="warning"}
Never expose your secret key on the client. Always verify tokens server-side.
::

## Hiding the Badge

reCAPTCHA v3 displays a badge in the corner of your site. You can hide it with CSS, but you must include attribution in your form:

```css
.grecaptcha-badge { visibility: hidden; }
```

```html
<p>This site is protected by reCAPTCHA and the Google
  <a href="https://policies.google.com/privacy">Privacy Policy</a> and
  <a href="https://policies.google.com/terms">Terms of Service</a> apply.
</p>
```

## Test Keys

Google provides test keys for development that always pass verification. Use these for local testing:

| Key Type | Value |
|----------|-------|
| Site Key | `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI` |
| Secret Key | `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe` |

::callout{type="info"}
Test keys will always return `success: true` with a score of `0.9`. See [Google's FAQ](https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha.-what-should-i-do) for more details.
::

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  $development: {
    scripts: {
      registry: {
        googleRecaptcha: {
          siteKey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'
        }
      }
    }
  }
})
```
