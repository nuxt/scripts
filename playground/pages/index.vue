<script lang="ts" setup>
import { useHead } from '#imports'
import { registry } from '../../src/registry'

useHead({
  title: 'Nuxt Scripts Playground',
})

// Get registry scripts and organize them
const registryScripts = await registry()

// Helper function to create playground path mapping
function getPlaygroundPath(script: any): string | null {
  const scriptName = script.label.toLowerCase().replace(/ /g, '-')

  // Special mappings for specific scripts
  const pathMappings: Record<string, string> = {
    'google-analytics': '/third-parties/google-analytics/nuxt-scripts',
    'google-tag-manager': '/third-parties/google-tag-manager',
    'cloudflare-web-analytics': '/third-parties/cloudflare-web-analytics/nuxt-scripts',
    'fathom-analytics': '/third-parties/fathom-analytics',
    'plausible-analytics': '/third-parties/plausible-analytics',
    'matomo-analytics': '/third-parties/matomo-analytics/nuxt-scripts',
    'rybbit-analytics': '/third-parties/rybbit-analytics',
    'databuddy-analytics': '/third-parties/databuddy-analytics',
    'umami-analytics': '/third-parties/umami-analytics',
    'segment': '/third-parties/segment',
    'meta-pixel': '/third-parties/meta-pixel',
    'x-pixel': '/third-parties/x-pixel/nuxt-scripts',
    'reddit-pixel': '/third-parties/reddit-pixel/nuxt-scripts',
    'snapchat-pixel': '/third-parties/snapchat/nuxt-scripts',
    'google-adsense': '/third-parties/google-adsense/nuxt-scripts',
    'carbon-ads': '/third-parties/carbon/nuxt-scripts',
    'clarity': '/third-parties/clarity/nuxt-scripts',
    'hotjar': '/third-parties/hotjar',
    'intercom': '/third-parties/intercom/facade',
    'crisp': '/third-parties/crisp/facade',
    'stripe': '/third-parties/stripe/nuxt-scripts',
    'paypal': '/third-parties/paypal/nuxt-scripts',
    'lemon-squeezy': '/third-parties/lemon-squeezy/component',
    'vimeo-player': '/third-parties/vimeo/nuxt-scripts',
    'youtube-player': '/third-parties/youtube/nuxt-scripts',
    'google-maps': '/third-parties/google-maps/nuxt-scripts',
    'google-recaptcha': '/third-parties/google-recaptcha/nuxt-scripts',
    'npm': '/npm/js-confetti',
  }

  return pathMappings[scriptName] || null
}

// Organize scripts by category
const analytics = registryScripts
  .filter(s => s.category === 'analytics')
  .map(s => ({
    name: s.label,
    path: getPlaygroundPath(s),
    logo: s.logo,
    registryScript: s,
  }))
  .filter(s => s.path)
  // Add additional Google Analytics variations
  .concat([
    {
      name: 'Google Analytics (Multiple)',
      path: '/third-parties/google-analytics/multiple',
      logo: registryScripts.find(s => s.label === 'Google Analytics')?.logo,
      registryScript: null,
    },
    {
      name: 'Google Analytics (DataLayers)',
      path: '/third-parties/google-analytics/datalayers',
      logo: registryScripts.find(s => s.label === 'Google Analytics')?.logo,
      registryScript: null,
    },
    {
      name: 'Plausible Analytics v2 (Oct 2025)',
      path: '/third-parties/plausible-analytics-v2',
      logo: registryScripts.find(s => s.label === 'Plausible Analytics')?.logo,
      registryScript: null,
    },
  ])

const pixels = registryScripts
  .filter(s => s.category === 'tracking')
  .map(s => ({
    name: s.label,
    path: getPlaygroundPath(s),
    logo: s.logo,
    registryScript: s,
  }))
  .filter(s => s.path)

const marketing = registryScripts
  .filter(s => s.category === 'marketing' || s.label === 'Hotjar')
  .map(s => ({
    name: s.label,
    path: getPlaygroundPath(s),
    logo: s.logo,
    registryScript: s,
  }))
  .filter(s => s.path)

const support = registryScripts
  .filter(s => s.category === 'support')
  .map(s => ({
    name: s.label,
    path: getPlaygroundPath(s),
    logo: s.logo,
    registryScript: s,
  }))
  .filter(s => s.path)
  // Add variations
  .concat([
    {
      name: 'Intercom (Default)',
      path: '/third-parties/intercom/default',
      logo: registryScripts.find(s => s.label === 'Intercom')?.logo,
      registryScript: null,
    },
    {
      name: 'Intercom (useScript)',
      path: '/third-parties/intercom/use-script',
      logo: registryScripts.find(s => s.label === 'Intercom')?.logo,
      registryScript: null,
    },
    {
      name: 'Crisp (Default)',
      path: '/third-parties/crisp/default',
      logo: registryScripts.find(s => s.label === 'Crisp')?.logo,
      registryScript: null,
    },
  ])

const payments = registryScripts
  .filter(s => s.category === 'payments')
  .map(s => ({
    name: s.label,
    path: getPlaygroundPath(s),
    logo: s.logo,
    registryScript: s,
  }))
  .filter(s => s.path)
  // Add Lemon Squeezy variation
  .concat([
    {
      name: 'Lemon Squeezy (Script)',
      path: '/third-parties/lemon-squeezy/script',
      logo: registryScripts.find(s => s.label === 'Lemon Squeezy')?.logo,
      registryScript: null,
    },
  ])

const content = registryScripts
  .filter(s => s.category === 'content')
  .map(s => ({
    name: s.label,
    path: getPlaygroundPath(s),
    logo: s.logo,
    registryScript: s,
  }))
  .filter(s => s.path)
  // Add variations
  .concat([
    {
      name: 'YouTube Multiple',
      path: '/third-parties/youtube/multiple',
      logo: registryScripts.find(s => s.label === 'YouTube Player')?.logo,
      registryScript: null,
    },
    {
      name: 'Google Maps (Markers)',
      path: '/third-parties/google-maps/markers',
      logo: registryScripts.find(s => s.label === 'Google Maps')?.logo,
      registryScript: null,
    },
    {
      name: 'Google Maps (Center)',
      path: '/third-parties/google-maps/center',
      logo: registryScripts.find(s => s.label === 'Google Maps')?.logo,
      registryScript: null,
    },
    {
      name: 'Google Maps (Query)',
      path: '/third-parties/google-maps/query',
      logo: registryScripts.find(s => s.label === 'Google Maps')?.logo,
      registryScript: null,
    },
    {
      name: 'Google Maps (Styled)',
      path: '/third-parties/google-maps/styled',
      logo: registryScripts.find(s => s.label === 'Google Maps')?.logo,
      registryScript: null,
    },
    {
      name: 'Google Maps (SFCs)',
      path: '/third-parties/google-maps/sfcs',
      logo: registryScripts.find(s => s.label === 'Google Maps')?.logo,
      registryScript: null,
    },
  ])

const npm = registryScripts
  .filter(s => s.category === 'utility' && s.label === 'NPM')
  .map(s => ({
    name: 'js-confetti',
    path: getPlaygroundPath(s),
    logo: s.logo,
    registryScript: s,
  }))
  .filter(s => s.path)

// Feature Examples
const features = [
  {
    name: 'Cookie Consent',
    path: '/features/cookie-consent',
  },
  {
    name: 'Script Bundling',
    path: '/features/bundle',
  },
  {
    name: 'Trigger: On Nuxt Ready',
    path: '/features/on-nuxt-ready',
  },
  {
    name: 'Top Level Await',
    path: '/features/top-level-await',
  },
  {
    name: 'Custom Registry Script',
    path: '/features/custom-registry',
  },
]

// Benchmark/Comparison Pages (Unhead vs Nuxt Scripts)
const benchmark = [
  {
    name: 'Google Analytics (Unhead)',
    path: '/third-parties/google-analytics/unhead',
  },
  {
    name: 'Google Adsense (Unhead)',
    path: '/third-parties/google-adsense/unhead',
  },
  {
    name: 'Google Maps (Default)',
    path: '/third-parties/google-maps/default',
  },
  {
    name: 'Vimeo (Default)',
    path: '/third-parties/vimeo/default',
  },
  {
    name: 'X Pixel (Default)',
    path: '/third-parties/x-pixel/default',
  },
  {
    name: 'YouTube (Default)',
    path: '/third-parties/youtube/default',
  },
  {
    name: 'Cloudflare (Default)',
    path: '/third-parties/cloudflare-web-analytics/default',
  },
  {
    name: 'Matomo (Default)',
    path: '/third-parties/matomo-analytics/default',
  },
  {
    name: 'Reddit Pixel (Default)',
    path: '/third-parties/reddit-pixel/default',
  },
  {
    name: 'Snapchat (Default)',
    path: '/third-parties/snapchat/default',
  },
]
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div class="text-center">
      <h1 class="text-3xl font-bold mb-4">
        Nuxt Scripts Playground
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Interactive examples and demos for all Nuxt Scripts registry scripts and features
      </p>
    </div>

    <!-- Analytics & Tracking -->
    <div>
      <h2 class="font-bold mb-5 text-xl flex items-center">
        <Icon
          name="carbon:analytics"
          class="opacity-70 mr-2"
        />Analytics & Tracking
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="(s, key) in analytics" :key="key">
          <ULink
            :to="s.path"
            class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div v-if="s.logo" class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <img v-if="s.logo?.startsWith && s.logo.startsWith('http')" :src="typeof s.logo === 'object' ? s.logo.dark || s.logo.light || s.logo : s.logo" :alt="s.name" class="w-8 h-8 object-contain flex-shrink-0">
              <div v-else-if="s.logo" class="w-8 h-8 flex-shrink-0 flex items-center justify-center" v-html="typeof s.logo === 'object' ? (s.logo.dark || s.logo.light || s.logo) : s.logo" />
            </div>
            <div v-else class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <Icon name="carbon:analytics" class="text-gray-400" />
            </div>
            <span class="font-medium">{{ s.name }}</span>
          </ULink>
        </div>
      </div>
    </div>

    <!-- Pixel Tracking -->
    <div>
      <h2 class="font-bold mb-5 text-xl flex items-center">
        <Icon
          name="carbon:pixel"
          class="opacity-70 mr-2"
        />Pixel Tracking
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="(s, key) in pixels" :key="key">
          <ULink
            :to="s.path"
            class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div v-if="s.logo" class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <img v-if="s.logo?.startsWith && s.logo.startsWith('http')" :src="typeof s.logo === 'object' ? s.logo.dark || s.logo.light || s.logo : s.logo" :alt="s.name" class="w-8 h-8 object-contain flex-shrink-0">
              <div v-else-if="s.logo" class="w-8 h-8 flex-shrink-0 flex items-center justify-center" v-html="typeof s.logo === 'object' ? (s.logo.dark || s.logo.light || s.logo) : s.logo" />
            </div>
            <div v-else class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <Icon name="carbon:pixel" class="text-gray-400" />
            </div>
            <span class="font-medium">{{ s.name }}</span>
          </ULink>
        </div>
      </div>
    </div>

    <!-- Marketing & Advertising -->
    <div>
      <h2 class="font-bold mb-5 text-xl flex items-center">
        <Icon
          name="carbon:chart-line"
          class="opacity-70 mr-2"
        />Marketing & Advertising
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="(s, key) in marketing" :key="key">
          <ULink
            :to="s.path"
            class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div v-if="s.logo" class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <img v-if="s.logo?.startsWith && s.logo.startsWith('http')" :src="typeof s.logo === 'object' ? s.logo.dark || s.logo.light || s.logo : s.logo" :alt="s.name" class="w-8 h-8 object-contain flex-shrink-0">
              <div v-else-if="s.logo" class="w-8 h-8 flex-shrink-0 flex items-center justify-center" v-html="typeof s.logo === 'object' ? (s.logo.dark || s.logo.light || s.logo) : s.logo" />
            </div>
            <div v-else class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <Icon name="carbon:chart-line" class="text-gray-400" />
            </div>
            <span class="font-medium">{{ s.name }}</span>
          </ULink>
        </div>
      </div>
    </div>

    <!-- Support & Communication -->
    <div>
      <h2 class="font-bold mb-5 text-xl flex items-center">
        <Icon
          name="carbon:chat"
          class="opacity-70 mr-2"
        />Support & Communication
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="(s, key) in support" :key="key">
          <ULink
            :to="s.path"
            class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div v-if="s.logo" class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <img v-if="s.logo?.startsWith && s.logo.startsWith('http')" :src="typeof s.logo === 'object' ? s.logo.dark || s.logo.light || s.logo : s.logo" :alt="s.name" class="w-8 h-8 object-contain flex-shrink-0">
              <div v-else-if="s.logo" class="w-8 h-8 flex-shrink-0 flex items-center justify-center" v-html="typeof s.logo === 'object' ? (s.logo.dark || s.logo.light || s.logo) : s.logo" />
            </div>
            <div v-else class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <Icon name="carbon:chat" class="text-gray-400" />
            </div>
            <span class="font-medium">{{ s.name }}</span>
          </ULink>
        </div>
      </div>
    </div>

    <!-- Payment Systems -->
    <div>
      <h2 class="font-bold mb-5 text-xl flex items-center">
        <Icon
          name="carbon:wallet"
          class="opacity-70 mr-2"
        />Payment Systems
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="(s, key) in payments" :key="key">
          <ULink
            :to="s.path"
            class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div v-if="s.logo" class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <img v-if="s.logo?.startsWith && s.logo.startsWith('http')" :src="typeof s.logo === 'object' ? s.logo.dark || s.logo.light || s.logo : s.logo" :alt="s.name" class="w-8 h-8 object-contain flex-shrink-0">
              <div v-else-if="s.logo" class="w-8 h-8 flex-shrink-0 flex items-center justify-center" v-html="typeof s.logo === 'object' ? (s.logo.dark || s.logo.light || s.logo) : s.logo" />
            </div>
            <div v-else class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <Icon name="carbon:wallet" class="text-gray-400" />
            </div>
            <span class="font-medium">{{ s.name }}</span>
          </ULink>
        </div>
      </div>
    </div>

    <!-- Content & Media -->
    <div>
      <h2 class="font-bold mb-5 text-xl flex items-center">
        <Icon
          name="carbon:video"
          class="opacity-70 mr-2"
        />Content & Media
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="(s, key) in content" :key="key">
          <ULink
            :to="s.path"
            class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div v-if="s.logo" class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <img v-if="s.logo?.startsWith && s.logo.startsWith('http')" :src="typeof s.logo === 'object' ? s.logo.dark || s.logo.light || s.logo : s.logo" :alt="s.name" class="w-8 h-8 object-contain flex-shrink-0">
              <div v-else-if="s.logo" class="w-8 h-8 flex-shrink-0 flex items-center justify-center" v-html="typeof s.logo === 'object' ? (s.logo.dark || s.logo.light || s.logo) : s.logo" />
            </div>
            <div v-else class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <Icon name="carbon:video" class="text-gray-400" />
            </div>
            <span class="font-medium">{{ s.name }}</span>
          </ULink>
        </div>
      </div>
    </div>

    <!-- NPM Scripts -->
    <div>
      <h2 class="font-bold mb-5 text-xl flex items-center">
        <Icon
          name="carbon:logo-npm"
          class="opacity-70 mr-2"
        />NPM Scripts
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="(s, key) in npm" :key="key">
          <ULink
            :to="s.path"
            class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div v-if="s.logo" class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <img v-if="s.logo?.startsWith && s.logo.startsWith('http')" :src="typeof s.logo === 'object' ? s.logo.dark || s.logo.light || s.logo : s.logo" :alt="s.name" class="w-8 h-8 object-contain flex-shrink-0">
              <div v-else-if="s.logo" class="w-8 h-8 flex-shrink-0 flex items-center justify-center" v-html="typeof s.logo === 'object' ? (s.logo.dark || s.logo.light || s.logo) : s.logo" />
            </div>
            <div v-else class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <Icon name="carbon:logo-npm" class="text-gray-400" />
            </div>
            <span class="font-medium">{{ s.name }}</span>
          </ULink>
        </div>
      </div>
    </div>

    <!-- Features -->
    <div>
      <h2 class="font-bold mb-5 text-xl flex items-center">
        <Icon
          name="carbon:tools"
          class="opacity-70 mr-2"
        />Features & Examples
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="(s, key) in features" :key="key">
          <ULink
            :to="s.path"
            class="block p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {{ s.name }}
          </ULink>
        </div>
      </div>
    </div>

    <!-- Benchmark -->
    <div>
      <h2 class="font-bold mb-5 text-xl flex items-center">
        <Icon
          name="carbon:compare"
          class="opacity-70 mr-2"
        />Performance Benchmarks
      </h2>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Compare Nuxt Scripts performance vs native implementations
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="(s, key) in benchmark" :key="key">
          <ULink
            :to="s.path"
            class="block p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {{ s.name }}
          </ULink>
        </div>
      </div>
    </div>
  </div>
</template>
