<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  title: 'Home',
})

const thirdParties = [
  {
    name: 'Cloudflare Web Analytics',
    path: '/third-parties/cloudflare-web-analytics/nuxt-scripts',
  },
  {
    name: 'Google Analytics',
    path: '/third-parties/google-analytics/nuxt-scripts',
  },
  {
    name: 'Google Tag Manager',
    path: '/third-parties/google-tag-manager',
  },
  {
    name: 'Meta Pixel',
    path: '/third-parties/meta-pixel',
  },
  {
    name: 'X Pixel',
    path: '/third-parties/x-pixel/nuxt-scripts',
  },
  {
    name: 'Google Adsense',
    path: '/third-parties/google-adsense/nuxt-scripts',
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
    path: '/third-parties/matomo-analytics/default',
  },
  {
    name: 'Hotjar',
    path: '/third-parties/hotjar',
  },
  {
    name: 'Intercom',
    path: '/third-parties/intercom/facade',
  },
  {
    name: 'Stripe',
    path: '/third-parties/stripe/nuxt-scripts',
  },
  {
    name: 'PayPal',
    path: '/third-parties/paypal/nuxt-scripts',
  },
  {
    name: 'Segment',
    path: '/third-parties/segment',
  },
  {
    name: 'Snapchat',
    path: '/third-parties/snapchat/nuxt-scripts',
  },
]

const thirdPartyComponents = [
  {
    name: 'Vimeo',
    path: '/third-parties/vimeo/nuxt-scripts',
  },
  {
    name: 'YouTube',
    path: '/third-parties/youtube/nuxt-scripts',
  },
  {
    name: 'Google Maps',
    path: '/third-parties/google-maps/nuxt-scripts',
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

const benchmark = [
  {
    name: 'Google Analytics',
    path: '/third-parties/google-analytics/unhead',
  },
  {
    name: 'Google Maps',
    path: '/third-parties/google-maps/default',
  },
  {
    name: 'Vimeo',
    path: '/third-parties/vimeo/default',
  },
  {
    name: 'xPixel',
    path: '/third-parties/x-pixel/default',
  },
  {
    name: 'YouTube',
    path: '/third-parties/youtube/default',
  },
  {
    name: 'Cloudflare Web Analytics',
    path: '/third-parties/cloudflare-web-analytics/default',
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
            name="carbon:logo-npm"
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
            name="carbon:open-panel-bottom"
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
      <div class="my-10">
        <h2 class="font-bold mb-5 text-xl flex items-center">
          <Icon
            name="carbon:compare"
            class="opacity-70 mr-2"
          />Benchmark
        </h2>
        <div class="grid grid-cols-3 gap-5">
          <div v-for="(s, key) in benchmark" :key>
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
