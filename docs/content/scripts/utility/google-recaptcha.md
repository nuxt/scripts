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
