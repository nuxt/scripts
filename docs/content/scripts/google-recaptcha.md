---
title: Google reCAPTCHA
description: Load score-based reCAPTCHA v3 or Enterprise and execute protected actions.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/google-recaptcha.ts
    size: xs
---

[Google reCAPTCHA](https://cloud.google.com/security/products/recaptcha) scores requests for likely spam and abuse without showing a checkbox.

[`useScriptGoogleRecaptcha()`{lang="ts"}](/scripts/google-recaptcha){lang="ts"} loads the selected client and exposes `grecaptcha`.

::callout
This registry integration supports score-based reCAPTCHA v3 and Enterprise flows. To render a v2 checkbox, load it separately with `useScript()`{lang="ts"} and follow Google's [v2 display guide](https://developers.google.com/recaptcha/docs/display).
::

::script-stats
::

::script-docs{:sections='["setup", "composable"]'}
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

Enterprise exposes its methods under `grecaptcha.enterprise`, so execute an action with that object rather than `grecaptcha.execute`:

```ts
const { onLoaded } = useScriptGoogleRecaptcha({
  siteKey: 'YOUR_SITE_KEY',
  enterprise: true,
})

onLoaded(({ grecaptcha }) => {
  grecaptcha.enterprise!.ready(async () => {
    const token = await grecaptcha.enterprise!.execute('YOUR_SITE_KEY', { action: 'submit' })
    // Send the token to your server for assessment.
  })
})
```

## Alternative domain

Set `recaptchaNet: true` where `google.com` is unavailable. Google documents `recaptcha.net` as its [alternative domain for global access](https://developers.google.com/recaptcha/docs/faq#can-i-use-recaptcha-globally):

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

## Server-side verification

Verify every reCAPTCHA token on your server. Google recommends checking both the score and expected action, then tuning the score threshold against your own traffic rather than treating `0.5` as universal. See the [reCAPTCHA v3 verification guide](https://developers.google.com/recaptcha/docs/v3#site_verify_response).

::code-group

```ts [server/api/verify-recaptcha.post.ts]
export default defineEventHandler(async (event) => {
  const { token } = await readBody(event)
  const secretKey = process.env.RECAPTCHA_SECRET_KEY
  if (!secretKey)
    throw createError({ statusCode: 500, message: 'Missing reCAPTCHA secret key' })

  const response = await $fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
    }),
  })

  if (!response.success || response.action !== 'submit' || response.score < 0.5) {
    throw createError({
      statusCode: 400,
      message: 'reCAPTCHA verification failed',
    })
  }

  return { success: true, score: response.score }
})
```

```ts [Enterprise: server/api/verify-recaptcha.post.ts]
export default defineEventHandler(async (event) => {
  const { token } = await readBody(event)
  const projectId = process.env.RECAPTCHA_PROJECT_ID
  const apiKey = process.env.RECAPTCHA_API_KEY
  const siteKey = process.env.NUXT_PUBLIC_SCRIPTS_GOOGLE_RECAPTCHA_SITE_KEY
  if (!projectId || !apiKey || !siteKey)
    throw createError({ statusCode: 500, message: 'Missing reCAPTCHA Enterprise configuration' })

  const response = await $fetch(
    `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`,
    {
      method: 'POST',
      body: {
        event: { token, siteKey, expectedAction: 'submit' },
      },
    }
  )

  const score = response.riskAnalysis?.score ?? 0
  if (!response.tokenProperties?.valid || response.tokenProperties.action !== 'submit' || score < 0.5) {
    throw createError({
      statusCode: 400,
      message: 'reCAPTCHA verification failed',
    })
  }

  return { success: true, score }
})
```

::

::callout{type="warning"}
Never expose your secret key on the client. Always verify tokens server-side.
::

::callout{type="info"}
Tokens expire after two minutes. Call `execute` when the user submits the protected action, not when the page loads. See Google's [reCAPTCHA v3 placement guidance](https://developers.google.com/recaptcha/docs/v3#placement_on_your_website).
::

## Hiding the badge

Google [allows you to hide the reCAPTCHA badge](https://developers.google.com/recaptcha/docs/faq#id-like-to-hide-the-recaptcha-badge.-what-is-allowed) if the required attribution remains visible in the user flow:

```css
.grecaptcha-badge { visibility: hidden; }
```

```html
<p>This site is protected by reCAPTCHA and the Google
  <a href="https://policies.google.com/privacy">Privacy Policy</a> and
  <a href="https://policies.google.com/terms">Terms of Service</a> apply.
</p>
```

## Testing

For reCAPTCHA v3, Google recommends a [separate key for test environments](https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha.-what-should-i-do). Scores in development may differ from production because v3 learns from real traffic. Do not use Google's published always-pass keys here; they only work with reCAPTCHA v2.

::script-types
::

## Example

This example scores a contact-form submission and verifies the token on the server:

::code-group

```vue [ContactForm.vue]
<script setup lang="ts">
const { onLoaded, onError } = useScriptGoogleRecaptcha()

const name = ref('')
const email = ref('')
const message = ref('')
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')

onError(() => {
  status.value = 'error'
})

function onSubmit() {
  status.value = 'loading'

  onLoaded(({ grecaptcha }) => {
    grecaptcha.ready(async () => {
      const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'contact' })

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
  })
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <input v-model="name" placeholder="Name" required>
    <input v-model="email" type="email" placeholder="Email" required>
    <textarea v-model="message" placeholder="Message" required />
    <button type="submit" :disabled="status === 'loading'">
      {{ status === 'loading' ? 'Sending...' : 'Submit' }}
    </button>
    <p v-if="status === 'success'">
      Message sent!
    </p>
    <p v-if="status === 'error'">
      Failed to send. Please try again.
    </p>
  </form>
</template>
```

```ts [server/api/contact.post.ts]
export default defineEventHandler(async (event) => {
  const { token, name, email, message } = await readBody(event)

  // Verify reCAPTCHA token
  const secretKey = process.env.RECAPTCHA_SECRET_KEY
  if (!secretKey)
    throw createError({ statusCode: 500, message: 'Missing reCAPTCHA secret key' })
  const verification = await $fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
    }),
  })

  if (!verification.success || verification.action !== 'contact' || verification.score < 0.5) {
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
