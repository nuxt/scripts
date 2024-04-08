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
    name: 'Hotjar',
    path: '/third-parties/hotjar',
  },
  {
    name: 'Intercom',
    path: '/third-parties/intercom',
  },
  {
    name: 'Segment',
    path: '/third-parties/segment',
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
          />Third Parties
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
