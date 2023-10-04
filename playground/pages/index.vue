<script lang="ts" setup>
</script>

<template>
  <div>
    <div class="mb-10">
      <h2 class="font-bold mb-5 text-xl flex items-center">
        <Icon name="carbon:analytics" class="opacity-70 mr-2" />Analytics
      </h2>
      <ul class="space-y-5">
        <li>
          <ULink to="/analytics/fathom" class="underline">
            Fathom Analytics
          </ULink>
        </li>
        <li>
          <ULink to="/analytics/google" class="underline">
            Google Analytics
          </ULink>
        </li>
        <li>
          <ULink to="/analytics/cloudflare" class="underline">
            Cloudflare Analytics
          </ULink>
        </li>
      </ul>
    </div>
    <div>
      <h2 class="font-bold mb-5 text-xl flex items-center">
        <Icon name="carbon:security" class="opacity-70 mr-2" />Captcha
      </h2>
      <ul class="space-y-5">
        <li>
          <ULink to="/captcha/cloudflare-turnstile" class="underline">
            Cloudflare Turnstile
          </ULink>
        </li>
        <li>
          <ULink to="/captcha/google-analytics" class="underline">
            Google Recaptcha
          </ULink>
        </li>
      </ul>
    </div>
  </div>
</template>
