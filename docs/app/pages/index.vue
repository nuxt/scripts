<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { useScriptsRegistry } from '~/composables/useScriptsRegistry'

const breakpoints = useBreakpoints(breakpointsTailwind)

useSeoMeta({
  title: 'Third-Party Scripts Meets Nuxt DX',
  description: 'Better performance, privacy, security and DX for third-party scripts.',
})

defineOgImageComponent('Home')

const card = ref()
onMounted(() => {
  card.value.forEach((el, i) => {
    const { isOutside } = useMouseInElement(el)
    const adjacentCards = [
      i - 1,
      i + 1,
      i - 4,
      i + 4,
    ]
      .filter((index) => {
        if (index < 0 || index > 15)
          return false
        if (i % 4 === 0 && index === i - 1)
          return false
        if (i % 4 === 3 && index === i + 1)
          return false
        return true
      })
      .map(index => card.value[index])
    // add class when mouse is inside the element
    const removeClasses = useDebounceFn(() => {
      el.classList.remove('card-raised-big')
      adjacentCards.forEach((adjacentCard) => {
        adjacentCard.classList.remove('card-raised-small')
      })
    }, 200)
    watch(isOutside, (isOutside) => {
      if (!isOutside) {
        el.classList.add('card-raised-big')
        adjacentCards.forEach((adjacentCard) => {
          adjacentCard.classList.add('card-raised-small')
        })
      }
      else {
        removeClasses()
      }
    })
  })
})

declare global {
  interface Window {
    JSConfetti: {
      new (): {
        addConfetti: (options?: { emojis: string[] }) => void
      }
    }
  }
}
const registry = await useScriptsRegistry()

const confettiEl = ref()
const { onLoaded } = useScript({
  key: 'confetti',
  src: 'https://cdn.jsdelivr.net/npm/js-confetti@latest/dist/js-confetti.browser.js',
}, {
  trigger: useScriptTriggerElement({
    trigger: 'visibility',
    el: confettiEl,
  }),
  use() {
    return { JSConfetti: window.JSConfetti }
  },
})
onMounted(() => {
  if (confettiEl.value) {
    useEventListener(confettiEl.value, 'mouseenter', () => {
      onLoaded(({ JSConfetti }) => {
        new JSConfetti().addConfetti({ emojis: ['🎉', '🎊'] })
      })
    })
  }
})

const links = [
  {
    label: 'Get started',
    trailingIcon: 'i-heroicons-arrow-right-20-solid',
    to: '/docs/getting-started',
    size: 'lg',
  },
  {
    label: 'Star on GitHub',
    icon: 'i-simple-icons-github',
    size: 'lg',
    color: 'gray',
    variant: 'ghost',
    to: 'https://github.com/nuxt/scripts',
    target: '_blank',
  },
]

const features = [
  {
    name: 'Better Web Vitals',
    description: 'Load scripts when they\'re needed with best practices non-blocking the rendering of your Nuxt app by default.',
    icon: 'i-ph-rocket-launch-duotone',
  },
  {
    name: 'Privacy for your users',
    description: 'Avoid leaking user data to third-party scripts that don\'t need it. Ensure your scripts are GDPR compliant.',
    icon: 'i-ph-user-circle-dashed-duotone',
  },
  {
    name: 'Developer Experience First',
    description: 'Type-safe and SSR friendly composables that just work wherever you need them.',
    icon: 'i-ph-code-simple-duotone',
  },
  {
    name: 'Secure third-parties',
    description: 'Protect your app from third-party scripts that could be made compromised.',
    icon: 'i-ph-lock-open-duotone',
  },
]

const btnGroupOrientation = computed(() => breakpoints.smaller('sm').value ? 'vertical' : 'horizontal')

const benchmarks = {
  googleMaps: {
    logo: registry.find(s => s.import?.name === 'useScriptGoogleMaps').logo,
    label: 'Google Maps',
    nuxt: {
      link: 'https://scripts-phi.vercel.app/third-parties/google-maps/nuxt-scripts',
      fcp: 1500,
      tbt: 70,
      lcp: 2700,
      si: 2500,
    },
    iframe: {
      link: 'https://scripts-phi.vercel.app/third-parties/google-maps/default',
      fcp: 1600,
      tbt: 830,
      lcp: 1600,
      si: 5600,
    },
  },
  youtube: {
    logo: registry.find(s => s.import?.name === 'useScriptYouTubePlayer').logo,
    label: 'YouTube',
    nuxt: {
      link: 'https://scripts-phi.vercel.app/third-parties/youtube/nuxt-scripts',
      fcp: 1200,
      tbt: 70,
      lcp: 1200,
      si: 1600,
    },
    iframe: {
      link: 'https://scripts-phi.vercel.app/third-parties/youtube/default',
      fcp: 1600,
      tbt: 3250,
      lcp: 1600,
      si: 8200,
    },
  },
  vimeo: {
    logo: registry.find(s => s.import?.name === 'useScriptVimeoPlayer').logo,
    label: 'Vimeo',
    nuxt: {
      link: 'https://scripts-phi.vercel.app/third-parties/vimeo/nuxt-scripts',
      fcp: 1500,
      tbt: 70,
      lcp: 2400,
      si: 2100,
    },
    iframe: {
      link: 'https://scripts-phi.vercel.app/third-parties/vimeo/default',
      fcp: 2200,
      tbt: 260,
      lcp: 2200,
      si: 3900,
    },
  },
  intercom: {
    logo: registry.find(s => s.import?.name === 'useScriptIntercom').logo,
    label: 'Intercom',
    nuxt: {
      link: 'https://scripts-phi.vercel.app/third-parties/intercom/nuxt-scripts',
      fcp: 1400,
      tbt: 220,
      lcp: 1400,
      si: 1900,
    },
    iframe: {
      link: 'https://scripts-phi.vercel.app/third-parties/intercom/default',
      fcp: 1400,
      tbt: 850,
      lcp: 1400,
      si: 2800,
    },
  },
}

const webVital = ref('tbt')

function humanizeMs(ms: number) {
  // if seconds, convert with 1 decimal place
  if (ms > 1000)
    return `${(ms / 1000).toFixed(1)}s`

  return `${ms}ms`
}

function timesFaster(nuxt: number, iframe: number) {
  // should display as 2.5 for 2500%
  return (iframe / nuxt).toFixed(1)
}
const { data: snippets } = await useAsyncData('code-snippets', () => queryCollection('snippets').all())

const contributors = useRuntimeConfig().public.contributors
</script>

<template>
  <div>
    <UPageHero
      class="max-w-full overflow-hidden"
      :links="links"
      orientation="horizontal"
    >
      <template #title>
        <div class="leading-tight">
          <span class="text-primary text-6xl">Third-Party Scripts </span><br> Meets Nuxt DX
        </div>
      </template>

      <template #description>
        Nuxt Scripts lets you load third-party scripts with better performance, privacy, security and DX. It includes
        many popular third-parties out of the box.
      </template>

      <div class="relative hidden xl:block">
        <div class=" w-full max-w-full w-full grid-transform justify-center items-center grid grid-cols-4 ">
          <a v-for="(script, key) in registry.filter(s => s.label !== 'Carbon Ads').slice(0, 16)" :key="key" ref="card" :href="`/scripts/${script.category}/${script.label.toLowerCase().replace(/ /g, '-')}`" class="card py-5 px-3 rounded block" :style="{ zIndex: key }">
            <template v-if="typeof script.logo !== 'string'">
              <div class="logo h-12 w-auto block dark:hidden" v-html="script.logo.light" />
              <div class="logo h-12 w-auto hidden dark:block" v-html="script.logo.dark" />
            </template>
            <div v-else-if="script.logo.startsWith('<svg')" class="logo h-10 w-auto" v-html="script.logo" />
            <img v-else class="h-10 w-auto mx-auto logo" :src="script.logo">
          </a>
        </div>
      </div>
    </UPageHero>

    <UPageSection :ui="{ container: 'pt-0 py-6 sm:py-14 lg:py-14' }">
      <ul class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-16">
        <ShowcaseCard v-for="feature in features" :key="feature.name" :label="feature.name" :description="feature.description">
          <UIcon :name="feature.icon" class="h-20 w-20 shrink-0 text-primary" />
        </ShowcaseCard>
      </ul>
    </UPageSection>

    <UPageSection :ui="{ container: 'pt-0 py-6 sm:py-14' }">
      <div class="xl:flex items-center justify-between gap-12">
        <div class="max-w-lg">
          <UIcon name="i-ph-magic-wand-duotone" class="h-[100px] w-[100px] text-primary" />
          <h2 class="text-xl xl:text-4xl font-bold mb-4">
            A powerful API with <span class="italic">just enough</span> magic
          </h2>
          <p class="text-gray-500 dark:text-gray-400 mb-3">
            Nuxt Scripts provides an abstraction layer on top of third-party scripts, providing SSR support and type-safety and
            while still giving you full low-level control over how a script is loaded.
          </p>
        </div>
        <UCard>
          <div class="padded-code xl:col-span-7 hidden sm:block">
            <div class="flex justify-center xl:justify-end">
              <div class="flex relative items-center bg-gradient-to-br to-green-200/50 from-blue-100/50 dark:from-green-500/10 dark:to-blue-500/20 rounded">
                <ContentRenderer v-if="snippets" :value="(snippets || []).find(d => d.id.endsWith('_magic-api.md'))" class="xl:col-span-6 max-w-full" />
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </UPageSection>

    <UContainer class="py-6 sm:py-20 gap-8 lg:gap-20 flex flex-col xl:flex-row ">
      <div class="max-w-lg">
        <UIcon name="i-ph-speedometer-duotone" class="h-[100px] w-[100px] text-primary" />
        <h2 class="text-xl xl:text-4xl font-bold flex items-center gap-4 mb-4">
          <span>Speed up with Facade Components</span>
        </h2>
        <p class="text-gray-500 dark:text-gray-400 mb-3">
          Nuxt Scripts provides several <NuxtLink to="https://developer.chrome.com/docs/lighthouse/performance/third-party-facades" class="underline" target="_blank">
            Facade Components
          </NuxtLink> out of the box.
        </p>
        <p class="text-gray-500 dark:text-gray-400 mb-3 text-pretty">
          Facade components are  fake UI elements that get replaced once a third-party script loads, they can significantly improve your performance while still providing a great user experience, however they do have <NuxtLink to="/docs/guides/facade-components" class="underline">
            trade-offs
          </NuxtLink>.
        </p>
      </div>
      <div class="w-full ">
        <div class="flex flex-col lg:grid grid-cols-2 mb-8 gap-8">
          <div v-for="(benchmark, key) in benchmarks" :key="key">
            <h3 class="md:text-xl font-bold flex items-center gap-3 mb-5">
              <div class="logo h-auto w-7 max-h-7" v-html="benchmark.logo" />
              {{ benchmark.label }}
            </h3>
            <div class="mb-3">
              <div class="flex items-center mb-1">
                <NuxtLink :to="benchmark.nuxt.link" class="dark:text-gray-300 text-gray-600 text-sm font-semibold underline">
                  Nuxt Scripts
                </NuxtLink>
                <UBadge variant="subtle" color="blue" class="ml-3">
                  {{ timesFaster(benchmark.nuxt[webVital], benchmark.iframe[webVital]) }}x Faster
                </UBadge>
              </div>
              <div class="flex items-center gap-3 max-w-full">
                <UProgress :model-value="benchmark.nuxt[webVital]" :max="benchmark.iframe[webVital]" color="info" class="flex flex-grow" />
                <div class="w-14 flex-grow text-right">
                  {{ humanizeMs(benchmark.nuxt[webVital]) }}
                </div>
              </div>
            </div>
            <div>
              <NuxtLink :to="benchmark.iframe.link" class="text-sm font-semibold underline">
                Iframe
              </NuxtLink>
              <div class="flex items-center gap-3">
                <UProgress :model-value="benchmark.iframe[webVital]" :max="benchmark.iframe[webVital]" color="info" class="" />
                <div class="w-14 flex-grow text-right">
                  {{ humanizeMs(benchmark.iframe[webVital]) }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <UFieldGroup class="mb-4 flex" :orientation="btnGroupOrientation">
          <UButton :variant="webVital === 'fcp' ? 'solid' : 'soft'" :active="webVital === 'fcp'" @click="webVital = 'fcp'">
            First Contentful Paint
          </UButton>
          <UButton :variant="webVital === 'tbt' ? 'solid' : 'soft'" :active="webVital === 'tbt'" @click="webVital = 'tbt'">
            Total Blocking Time
          </UButton>
          <UButton :variant="webVital === 'si' ? 'solid' : 'soft'" :active="webVital === 'si'" @click="webVital = 'si'">
            Speed Index
          </UButton>
        </UFieldGroup>
        <p class="text-gray-500 dark:text-gray-400">
          <span class="opacity-50 text-sm">*Note that PageSpeed Insights lab data is a snapshot from a particular day, which tends to be variable. We will be updating this section with aggregated results and/or field data from production usage as soon as it's available.</span>
        </p>
      </div>
    </UContainer>

    <UPageSection :ui="{ wrapper: 'pt-0 py-6 sm:py-14' }">
      <div class="xl:flex items-center justify-between gap-12">
        <div class="max-w-lg">
          <UIcon name="i-ph-cookie-duotone" class="h-[100px] w-[100px] text-primary" />
          <h2 class="text-xl xl:text-4xl font-bold mb-4">
            Cookie consent that's good enough to eat
          </h2>
          <p class="text-gray-500 dark:text-gray-400 mb-3">
            Nuxt Scripts aims to improve end-user privacy by providing a <NuxtLink to="/docs/guides/consent" class="underline">
              simple API for managing cookie consent
            </NuxtLink>.
          </p>
          <p class="text-gray-500 dark:text-gray-400 mb-3">
            All scripts can be loaded conditionally based on user consent, set it up however you need.
          </p>
        </div>
        <UCard>
          <div class="padded-code xl:col-span-7 hidden sm:block">
            <div class="flex justify-center xl:justify-end">
              <div class="flex relative items-center bg-gradient-to-br to-green-200/50 from-blue-100/50 dark:from-green-500/10 dark:to-blue-500/20 rounded">
                <ContentRenderer v-if="snippets" :value="(snippets || []).find(d => d.id.endsWith('_cookie-api.md'))" class="xl:col-span-6 max-w-full" />
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </UPageSection>

    <UPageSection :ui="{ wrapper: 'py-6 sm:py-12' }">
      <div class="xl:flex items-center gap-12">
        <div>
          <div class="max-w-lg">
            <UIcon name="i-ph-handshake-duotone" class="h-[100px] w-[100px] text-primary" />
            <h2 class="text-xl xl:text-4xl font-bold flex items-center gap-4 mb-4">
              <span>A faster web collaboration</span>
            </h2>
            <p class="text-gray-500 dark:text-gray-400 mb-4">
              Nuxt Scripts was designed and built by the Nuxt core team in collaboration with the <a href="https://developer.chrome.com/aurora" target="_blank" class="underline">Chrome Aurora</a> team at Google.
            </p>
            <p class="text-gray-500 dark:text-gray-400 mb-1">
              Nuxt Scripts is being actively maintained by the Nuxt core team and amazing community contributors, we welcome all contributions.
            </p>
          </div>
        </div>
        <div class="flex-grow">
          <div class="max-w-lg flex flex-col items-center">
            <div class="xl:flex justify-center items-center gap-3 mb-8">
              <div class="font-light text-6xl mb-2">
                <Icon name="carbon:user-favorite-alt" />
                {{ contributors.length }}
              </div>
              <div class="text-sm opacity-80">
                Contributors
              </div>
            </div>
            <div class="mb-7 gap-2 mx-auto text-center grid grid-cols-4 sm:grid-cols-7">
              <UAvatar v-for="(c, index) in contributors" :key="index" :alt="`GitHub User ${c}`" size="xl" height="45" width="45" loading="lazy" :src="`https://avatars.githubusercontent.com/u/${c}?s=80&v=4`" />
            </div>
          </div>
        </div>
      </div>
    </UPageSection>

    <UPageSection :ui="{ wrapper: 'pt-0 py-6 sm:py-14' }">
      <div class="text-center">
        <UIcon name="i-ph-book-bookmark-duotone" class="h-[50px] w-[50px] text-primary" />
        <h2 class="text-xl xl:text-4xl font-bold mb-12 text-center">
          Watch the intro videos from the pros.
        </h2>
        <div class="lg:flex justify-between gap-10 items-center">
          <ScriptYouTubePlayer video-id="sjMqUUvH9AE" class="rounded-xl overflow-hidden group">
            <template #awaitingLoad>
              <div class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[48px] w-[68px] group-hover:opacity-80 transition">
                <svg height="100%" version="1.1" viewBox="0 0 68 48" width="100%"><path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00" /><path d="M 45,24 27,14 27,34" fill="#fff" /></svg>
              </div>
            </template>
          </ScriptYouTubePlayer>
          <ScriptYouTubePlayer video-id="jDQtxlRUf54" class="rounded-xl overflow-hidden group">
            <template #awaitingLoad>
              <div class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[48px] w-[68px] group-hover:opacity-80 transition">
                <svg height="100%" version="1.1" viewBox="0 0 68 48" width="100%"><path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00" /><path d="M 45,24 27,14 27,34" fill="#fff" /></svg>
              </div>
            </template>
          </ScriptYouTubePlayer>
        </div>
      </div>
    </UPageSection>

    <UPageSection :ui="{ wrapper: 'pt-0 py-6 sm:py-14' }">
      <div class="xl:flex items-center justify-between gap-12">
        <div class="max-w-lg">
          <UIcon name="i-ph-share-network-duotone" class="h-[100px] w-[100px] text-primary" />
          <h2 class="text-xl xl:text-4xl font-bold mb-4">
            Privacy-first Social Embeds
          </h2>
          <p class="text-gray-500 dark:text-gray-400 mb-3">
            Embed X (Twitter) and Instagram posts without loading third-party scripts. All content is fetched server-side and proxied through your domain.
          </p>
          <p class="text-gray-500 dark:text-gray-400 mb-3">
            Zero client-side API calls, no cookies, no tracking. Your users' privacy is protected while still displaying rich social content.
          </p>
          <div class="flex gap-3 mt-6">
            <UButton to="/scripts/content/x-embed" variant="soft">
              X Embed Docs
            </UButton>
            <UButton to="/scripts/content/instagram-embed" variant="soft">
              Instagram Embed Docs
            </UButton>
          </div>
        </div>
        <div class="flex-1 mt-8 xl:mt-0">
          <ScriptXEmbed tweet-id="1829496926842368288" class="max-w-md mx-auto">
            <template #default="{ userName, userHandle, userAvatar, text, datetime, likesFormatted, tweetUrl, isVerified }">
              <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <div class="flex items-start gap-3 mb-3">
                  <img :src="userAvatar" :alt="userName" class="w-10 h-10 rounded-full">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1">
                      <span class="font-semibold text-gray-900 dark:text-white truncate">{{ userName }}</span>
                      <svg v-if="isVerified" class="w-4 h-4 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                      </svg>
                    </div>
                    <span class="text-gray-500 text-sm">@{{ userHandle }}</span>
                  </div>
                  <a :href="tweetUrl" target="_blank" rel="noopener noreferrer" aria-label="Share on X" class="text-gray-400 hover:text-gray-600 flex-shrink-0">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  </a>
                </div>
                <p class="text-gray-900 dark:text-white text-sm mb-3 line-clamp-3">
                  {{ text }}
                </p>
                <div class="flex items-center gap-4 text-gray-500 text-xs">
                  <span>{{ datetime }}</span>
                  <span>{{ likesFormatted }} likes</span>
                </div>
              </div>
            </template>
            <template #loading>
              <div class="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 max-w-md mx-auto animate-pulse">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full" />
                  <div class="space-y-2">
                    <div class="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded" />
                    <div class="h-2 w-16 bg-gray-300 dark:bg-gray-600 rounded" />
                  </div>
                </div>
                <div class="space-y-2">
                  <div class="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full" />
                  <div class="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
                </div>
              </div>
            </template>
          </ScriptXEmbed>
        </div>
      </div>
    </UPageSection>

    <UPageSection :ui="{ wrapper: 'pt-0 py-6 sm:py-14' }">
      <UPageCTA
        description="Learn all of the fundamentals of Nuxt Scripts in the fun interactive confetti tutorial."
        card
      >
        <template #title>
          Try out our JS Confetti Tutorial
        </template>
        <template #links>
          <div ref="confettiEl">
            <UButton size="xl" variant="solid" icon="i-ph-sparkle-duotone" color="primary" to="/docs/getting-started/confetti-tutorial">
              Get started
            </UButton>
          </div>
        </template>
      </UPageCTA>
    </UPageSection>
  </div>
</template>

<style lang="postcss">
.hero_code div div {
  @apply dark:bg-gray-900/60 backdrop-blur-3xl bg-white/60;
}
.logo svg {
  max-height: 100%;
  max-width: 100%;
  display: block;
  margin: 0 auto;
}
.radial-fade {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 2;
  left: 0;
  top: 0;
}
.grid-transform {
  position: relative;
  transform: perspective(600px) rotateX(-1deg) rotateY(-15deg);
}
.grid-transform:before {
  content: '';
  z-index: -1;
  left: -10%;
  top: -10%;
  position: absolute;
  width: 150%;
  height: 120%;
  background: radial-gradient(circle, #D9FBE8 0%, white 70%, transparent 100%);
  opacity: 0.5;
}
.dark .grid-transform:before {
  background: radial-gradient(circle, #1F2937 0%, #020420 70%, transparent 100%);
}
.card {
  border: 1px solid transparent;
  box-shadow:  2px 2px 5px rgba(217, 251, 232, 0.5),
  3px 3px 10px rgba(217, 251, 232, 0.5),
  6px 6px 20px rgba(217, 251, 232, 0.1);
  transition: all 0.2s;
}
.dark .card {
  box-shadow:  2px 2px 5px rgba(31, 41, 55, 0.2),
  3px 3px 10px rgba(31, 41, 55, 0.2),
  6px 6px 20px rgba(31, 41, 55, 0.1);
}
.card svg {
  opacity: 0.7;
  transition: 0.2s;
}

.dark .card:hover {
  box-shadow:  3px 3px 5px rgba(31, 41, 55, 1),
  5px 5px 10px rgba(31, 41, 55, 1),
  10px 10px 20px rgba(31, 41, 55, 1);
}

.card:hover svg {
  opacity: 1;
}
.card svg {
  shape-rendering: geometricPrecision;
}

.card-raised-small {
  border: 1px solid rgba(0, 193, 106, 0.3);
  transform: scale(1.05) translateX(-5px) translateY(-5px) translateZ(0);
  animation: text-glow-small 1.5s alternate infinite ease-in-out;
}

.card-raised-big {
  border: 1px solid rgba(0, 193, 106, 0.5);
  background-color: white;
  transform: scale(1.15) translateX(-20px) translateY(-20px) translateZ(15px);
  animation: text-glow 1.5s alternate infinite ease-in-out;
}

.dark .card-raised-big {
  border: 1px solid rgba(217, 251, 232, 0.3);
  background-color: #020420;
}

.dark .card-raised-small {
  border: 1px solid rgba(217, 251, 232, 0.2);
  transform: scale(1.05) translateX(-5px) translateY(-5px) translateZ(0);
}

@keyframes text-glow {
  0% {
    filter: drop-shadow(0px 0px 2px rgba(56,239,125, 0.5));
  }
  100% {
    filter: drop-shadow(0px 1px 8px rgba(56,239,125, 1));
  }
}

@keyframes text-glow-small {
  0% {
    filter: drop-shadow(0px 0px 2px rgba(56,239,125, 0.1));
  }
  100% {
    filter: drop-shadow(0px 1px 4px rgba(56,239,125, 0.5));
  }
}
.padded-code pre {
  padding: 0.75em 1em;
}
</style>
