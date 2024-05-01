<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  title: 'Home',
})

const thirdParties = [
  {
    name: 'Cloudflare Web Analytics',
    path: '/third-parties/cloudflare-web-analytics',
  },
  {
    name: 'Google Analytics',
    path: '/third-parties/google-analytics',
  },
  {
    name: 'Google Tag Manager',
    path: '/third-parties/google-tag-manager',
  },
  {
    name: 'Facebook Pixel',
    path: '/third-parties/facebook-pixel',
  },
  {
    name: 'X Pixel',
    path: '/third-parties/x-pixel',
  },
  {
    name: 'Fathom Analytics',
    path: '/third-parties/fathom-analytics',
  },
  {
    name: 'Plausible Analytics',
    path: '/third-parties/plausible-analytics',
  },
  {
    name: 'Matomo Analytics',
    path: '/third-parties/matomo-analytics',
  },
  {
    name: 'Hotjar',
    path: '/third-parties/hotjar',
  },
  {
    name: 'Intercom',
    path: '/third-parties/intercom',
  },
  {
    name: 'Stripe',
    path: '/third-parties/stripe',
  },
  {
    name: 'Segment',
    path: '/third-parties/segment',
  },
  {
    name: 'Vimeo',
    path: '/third-parties/vimeo',
  },
]

const thirdPartyComponents = [
  {
    name: 'Vimeo',
    path: '/third-parties/vimeo-component',
  },
  {
    name: 'YouTube',
    path: '/third-parties/youtube',
  },
  {
    name: 'Google Maps',
    path: '/third-parties/google-maps',
  },
]

const features = [
  {
    name: 'Cookie Consent',
    path: '/features/cookie-consent',
  },
  {
    name: 'Trigger: On Nuxt Ready',
    path: '/features/on-nuxt-ready',
  },
]
</script>

<template>
  <div>
    <div>
      <div class="mb-10">
        <h2 class="font-bold mb-5 text-xl flex items-center">
          <Icon
            name="carbon:script"
            class="opacity-70 mr-2"
          />Third Party Scripts
        </h2>
        <div class="grid grid-cols-3 gap-5">
          <div v-for="(s, key) in thirdParties" :key>
            <ULink
              :to="s.path"
              class="underline"
            >
              {{ s.name }}
            </ULink>
          </div>
        </div>
      </div>
      <div class="mb-10">
        <h2 class="font-bold mb-5 text-xl flex items-center">
          <Icon
            name="carbon:script"
            class="opacity-70 mr-2"
          />NPM Scripts
        </h2>
        <div class="grid grid-cols-3 gap-5">
          <div>
            <ULink
              to="/npm/js-confetti"
              class="underline"
            >
              js-confetti
            </ULink>
          </div>
        </div>
      </div>
      <div class="mb-10">
        <h2 class="font-bold mb-5 text-xl flex items-center">
          <Icon
            name="carbon:script"
            class="opacity-70 mr-2"
          />Third Party Components
        </h2>
        <div class="grid grid-cols-3 gap-5">
          <div v-for="(s, key) in thirdPartyComponents" :key>
            <ULink
              :to="s.path"
              class="underline"
            >
              {{ s.name }}
            </ULink>
          </div>
        </div>
      </div>
      <div>
        <h2 class="font-bold mb-5 text-xl flex items-center">
          <Icon
            name="carbon:intent-request-create"
            class="opacity-70 mr-2"
          />Features
        </h2>
        <div class="grid grid-cols-3 gap-5">
          <div v-for="(s, key) in features" :key>
            <ULink
              :to="s.path"
              class="underline"
            >
              {{ s.name }}
            </ULink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
