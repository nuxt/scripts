# Google reCAPTCHA Implementation Plan

## Research Summary

**NPM Package**: No official browser package from Google. Load directly from Google's CDN.

**Script URL**: `https://www.google.com/recaptcha/api.js` (v3) or `https://www.google.com/recaptcha/enterprise.js` (Enterprise)

**Scope**: v3 only (score-based, invisible). No v2 checkbox/invisible support - simplifies implementation, no component needed.

## Implementation

### 1. Registry Script (`src/runtime/registry/google-recaptcha.ts`)

```ts
import { withQuery } from 'ufo'
import { useRegistryScript } from '../utils'
import { object, string, optional, boolean } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

export const GoogleRecaptchaOptions = object({
  siteKey: string(),
  // Use enterprise.js instead of api.js
  enterprise: optional(boolean()),
  // Use recaptcha.net (works in China)
  recaptchaNet: optional(boolean()),
  // Language code
  hl: optional(string()),
})

export type GoogleRecaptchaInput = RegistryScriptInput<typeof GoogleRecaptchaOptions>

export interface GoogleRecaptchaApi {
  grecaptcha: {
    ready: (callback: () => void) => void
    execute: (siteKey: string, options: { action: string }) => Promise<string>
    // Enterprise-specific (same shape, different namespace)
    enterprise?: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

declare global {
  interface Window extends GoogleRecaptchaApi {}
}

export function useScriptGoogleRecaptcha<T extends GoogleRecaptchaApi>(_options?: GoogleRecaptchaInput) {
  return useRegistryScript<T, typeof GoogleRecaptchaOptions>('googleRecaptcha', options => {
    const baseUrl = options?.recaptchaNet
      ? 'https://www.recaptcha.net/recaptcha'
      : 'https://www.google.com/recaptcha'
    const scriptPath = options?.enterprise ? 'enterprise.js' : 'api.js'

    return {
      scriptInput: {
        src: withQuery(`${baseUrl}/${scriptPath}`, {
          render: options?.siteKey,
          hl: options?.hl,
        }),
        crossorigin: false,
      },
      schema: import.meta.dev ? GoogleRecaptchaOptions : undefined,
      scriptOptions: {
        use() {
          return { grecaptcha: window.grecaptcha }
        },
      },
      clientInit: import.meta.server
        ? undefined
        : () => {
            // Queue pattern for deferred ready callbacks
            const w = window as any
            w.grecaptcha = w.grecaptcha || {}
            w.grecaptcha.ready = w.grecaptcha.ready || function(cb: () => void) {
              (w.___grecaptcha_cfg = w.___grecaptcha_cfg || {}).fns =
                (w.___grecaptcha_cfg.fns || []).concat([cb])
            }
          },
    }
  }, _options)
}
```

### 2. Types (`src/runtime/types.ts`)

```ts
import type { GoogleRecaptchaInput } from './registry/google-recaptcha'

// in ScriptRegistry interface
googleRecaptcha?: GoogleRecaptchaInput
```

### 3. Registry Entry (`src/registry.ts`)

```ts
{
  label: 'Google reCAPTCHA',
  category: 'utility',
  scriptBundling: (options?: GoogleRecaptchaInput) => {
    const baseUrl = options?.recaptchaNet
      ? 'https://www.recaptcha.net/recaptcha'
      : 'https://www.google.com/recaptcha'
    return `${baseUrl}/${options?.enterprise ? 'enterprise.js' : 'api.js'}`
  },
  logo: `<svg>...</svg>`, // reCAPTCHA logo
  import: {
    name: 'useScriptGoogleRecaptcha',
    from: await resolve('./runtime/registry/google-recaptcha'),
  },
}
```

### 4. Documentation (`docs/content/scripts/utility/google-recaptcha.md`)

```md
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

### Nuxt Config Setup

::code-group

\`\`\`ts [Always enabled]
export default defineNuxtConfig({
  scripts: {
    registry: {
      googleRecaptcha: {
        siteKey: 'YOUR_SITE_KEY'
      }
    }
  }
})
\`\`\`

\`\`\`ts [Production only]
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
\`\`\`

::

#### With Environment Variables

\`\`\`ts [nuxt.config.ts]
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
          siteKey: '', // NUXT_PUBLIC_SCRIPTS_GOOGLE_RECAPTCHA_SITE_KEY
        },
      },
    },
  },
})
\`\`\`

## useScriptGoogleRecaptcha

\`\`\`ts
const { proxy } = useScriptGoogleRecaptcha({
  siteKey: 'YOUR_SITE_KEY'
})

// Execute reCAPTCHA and get token
proxy.grecaptcha.ready(async () => {
  const token = await proxy.grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' })
  // Send token to your server for verification
})
\`\`\`

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### GoogleRecaptchaApi

\`\`\`ts
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
\`\`\`

### Config Schema

\`\`\`ts
export const GoogleRecaptchaOptions = object({
  siteKey: string(),
  enterprise: optional(boolean()),
  recaptchaNet: optional(boolean()),
  hl: optional(string()),
})
\`\`\`

## Example

Using reCAPTCHA v3 to protect a form submission.

::code-group

\`\`\`vue [ContactForm.vue]
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
\`\`\`

::

## Hiding the Badge

reCAPTCHA v3 displays a badge in the corner of your site. You can hide it with CSS, but you must include attribution in your form:

\`\`\`css
.grecaptcha-badge { visibility: hidden; }
\`\`\`

\`\`\`html
<p>This site is protected by reCAPTCHA and the Google
  <a href="https://policies.google.com/privacy">Privacy Policy</a> and
  <a href="https://policies.google.com/terms">Terms of Service</a> apply.
</p>
\`\`\`
```

### 5. Testing

E2E test in `test/fixtures/basic/pages/recaptcha.vue`:
- Load script with siteKey
- Verify `grecaptcha.ready()` fires
- Verify `grecaptcha.execute()` returns promise

## Files to Create/Modify

- [ ] `src/runtime/registry/google-recaptcha.ts` (new)
- [ ] `src/runtime/types.ts` (add import + ScriptRegistry)
- [ ] `src/registry.ts` (add entry with scriptBundling)
- [ ] `docs/content/scripts/utility/google-recaptcha.md` (new)
