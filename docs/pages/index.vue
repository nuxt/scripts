<script setup lang="ts">
import { useScriptsRegistry } from '~/composables/useScriptsRegistry'

const registry = useScriptsRegistry()

useSeoMeta({
  title: 'Third-Party Scripts Meets Nuxt DX.',
  description: 'Nuxt Scripts lets you load third-party scripts better performance, privacy, security and DX. It includes many popular third-parties out of the box.',
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

const benchmarks = {
  googleMaps: {
    logo: registry.find(s => s.import.name === 'useScriptGoogleMaps').logo,
    label: 'Google Maps',
    nuxt: {
      fcp: 1500,
      tbt: 50,
      lcp: 2700,
      si: 2500,
    },
    iframe: {
      fcp: 1600,
      tbt: 830,
      lcp: 1600,
      si: 5600,
    },
  },
  youtube: {
    logo: registry.find(s => s.import.name === 'useScriptYouTubePlayer').logo,
    label: 'YouTube',
    nuxt: {
      fcp: 1200,
      tbt: 70,
      lcp: 1200,
      si: 1600,
    },
    iframe: {
      fcp: 1600,
      tbt: 3250,
      lcp: 1600,
      si: 8200,
    },
  },
  vimeo: {
    logo: registry.find(s => s.import.name === 'useScriptVimeoPlayer').logo,
    label: 'Vimeo',
    nuxt: {
      fcp: 1500,
      tbt: 70,
      lcp: 2400,
      si: 2100,
    },
    iframe: {
      fcp: 2200,
      tbt: 260,
      lcp: 2200,
      si: 3900,
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
</script>

<template>
  <div>
    <ULandingHero
      :links="links"
      orientation="horizontal"
      :ui="{
        container: 'flex flex-row justify-start items-center',
        links: 'flex items-center gap-2',
        description: 'text-gray-500 dark:text-gray-400 text-xl max-w-2xl leading-normal mb-10',
      }"
    >
      <template #title>
        <div class="leading-tight">
          <span class="text-primary">Third-Party Scripts </span><br> Meets Nuxt DX.
        </div>
      </template>

      <template #description>
        Nuxt Scripts lets you load third-party scripts better performance, privacy, security and DX. It includes
        many popular third-parties out of the box.
      </template>

      <div class="relative hidden xl:block">
        <div class="absolute -z-1 -right-[450px] -top-[200px]">
          <div class="w-[450px] grid-transform justify-center items-center grid grid-cols-4 ">
            <a v-for="(script, key) in registry.slice(0, 16)" :key="key" ref="card" :href="`/scripts/${script.category}/${script.label.toLowerCase().replace(/ /g, '-')}`" class="card py-5 px-3 rounded block" :style="{ zIndex: key }">
              <template v-if="typeof script.logo !== 'string'">
                <div class="logo h-12 w-auto block dark:hidden" v-html="script.logo.light" />
                <div class="logo h-12 w-auto hidden dark:block" v-html="script.logo.dark" />
              </template>
              <div v-else class="logo h-10 w-auto" v-html="script.logo" />
            </a>
          </div>
        </div>
      </div>
    </ULandingHero>

    <ULandingSection :ui="{ wrapper: 'py-6 sm:py-12' }">
      <ul class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-16">
        <li v-for="feature in features" :key="feature.name" class="flex flex-col gap-y-2">
          <UIcon :name="feature.icon" class="h-8 w-8 shrink-0 text-primary" />
          <div class="flex flex-col gap-y-1">
            <h5 class="font-medium text-gray-900 dark:text-white">
              {{ feature.name }}
            </h5>
            <p class="text-gray-500 dark:text-gray-400">
              {{ feature.description }}
            </p>
          </div>
        </li>
      </ul>
    </ULandingSection>

    <div class="py-6 sm:py-12 gap-20 mb-12 flex flex-col xl:flex-row items-center max-w-5xl mx-auto">
      <div class="max-w-lg">
        <h2 class="text-xl xl:text-4xl font-bold flex items-center gap-4 mb-4">
          <UIcon name="i-ph-speedometer-duotone" class="h-12 w-12 shrink-0 text-primary" />
          <span>Master Your Web Vitals</span>
        </h2>
        <p class="text-gray-500 dark:text-gray-400 mb-1">
          Nuxt Scripts comes with <NuxtLink to="https://developer.chrome.com/docs/lighthouse/performance/third-party-facades" class="underline" target="_blank">
            Facade Components
          </NuxtLink> preconfigured for maximum performance
          and developer experience.
        </p>
        <p class="text-gray-500 dark:text-gray-400">
          <span class="opacity-50">*Benchmarks below are from pagespeed.web.dev running Mobile with variability, they are not accurate.</span>
        </p>
        <UButtonGroup class="mt-10 flex flex-col md:flex-row">
          <UButton :variant="webVital === 'fcp' ? 'solid' : 'soft'" :active="webVital === 'fcp'" @click="webVital = 'fcp'">
            First Contentful Paint
          </UButton>
          <UButton :variant="webVital === 'tbt' ? 'solid' : 'soft'" :active="webVital === 'tbt'" @click="webVital = 'tbt'">
            Total Blocking Time
          </UButton>
          <UButton :variant="webVital === 'si' ? 'solid' : 'soft'" :active="webVital === 'si'" @click="webVital = 'si'">
            Speed Index
          </UButton>
        </UButtonGroup>
      </div>
      <div class="w-full">
        <div class="flex flex-col grid-cols-2 gap-8">
          <div v-for="(benchmark, key) in benchmarks" :key="key">
            <h3 class="md:text-xl font-bold flex items-center gap-2 mb-5">
              <div class="hidden md:block logo h-5 w-auto" v-html="benchmark.logo" />
              {{ benchmark.label }} <UBadge variant="soft" color="blue">
                {{ timesFaster(benchmark.nuxt[webVital], benchmark.iframe[webVital]) }}x Faster
              </UBadge>
            </h3>
            <div class="mb-3">
              <div class="text-sm font-semibold">
                Nuxt Scripts
              </div>
              <div class="flex items-center gap-3 max-w-full">
                <UProgress :value="benchmark.nuxt[webVital]" :max="benchmark.iframe[webVital]" color="purple" class="flex flex-grow" />
                <div class="w-14 flex-grow">
                  {{ humanizeMs(benchmark.nuxt[webVital]) }}
                </div>
              </div>
            </div>
            <div>
              <div class="text-sm font-semibold">
                Iframe
              </div>
              <div class="flex items-center gap-3">
                <UProgress :value="benchmark.iframe[webVital]" :max="benchmark.iframe[webVital]" color="purple" class="" />
                <div class="w-14 flex-grow">
                  {{ humanizeMs(benchmark.iframe[webVital]) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="postcss">
.hero_code div div {
  @apply dark:bg-gray-900/60 backdrop-blur-3xl bg-white/60;
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
</style>
