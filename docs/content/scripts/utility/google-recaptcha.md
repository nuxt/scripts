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

Using reCAPTCHA v3 to protect a form submission.

::code-group

```vue [ContactForm.vue]
<script setup lang="ts">
const { proxy } = useScriptGoogleRecaptcha()

async function onSubmit() {
  proxy.grecaptcha.ready(async () => {
    const token = await proxy.grecaptcha.execute('YOUR_SITE_KEY', { action: 'contact' })
    // Send form data + token to your API
    await $fetch('/api/contact', {
      method: 'POST',
      body: { token, /* form fields */ }
    })
  })
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <!-- form fields -->
    <button type="submit">Submit</button>
  </form>
</template>
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
