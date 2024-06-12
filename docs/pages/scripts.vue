<script setup lang="ts">
import { useScriptsRegistry } from '~/composables/useScriptsRegistry'

const categories = {
  ads: {
    label: 'Ads',
    description: 'Monetize your website with ads.',
  },
  analytics: {
    label: 'Analytics',
    description: 'Track your users and their behavior on your website.',
  },
  tracking: {
    label: 'Tracking',
    description: 'More advanced tracking and analytics of users.',
  },
  marketing: {
    label: 'Marketing',
    description: 'Interact with your users with tools like live chat, surveys, and more.',
  },
  payments: {
    label: 'Payments',
    description: 'Access payments on your website.',
  },
  content: {
    label: 'Content',
    description: 'Display videos, maps and other content on your website.',
  },
  utility: {
    label: 'Tools',
    description: 'Miscellaneous tools to help you build your website.',
  },
}

defineOgImageComponent('Home')

useSeoMeta({
  title: 'Script Registry',
  description: 'The registry is a collection of third-party scripts with out-of-the-box composable and component integrations for Nuxt Scripts.',
})

// group by category
const scriptsCategories = useScriptsRegistry().reduce((acc, script) => {
  if (!acc[script.category])
    acc[script.category] = []
  acc[script.category].push({
    ...script,
    // turn title label into a camel case slug
    key: script.label.toLowerCase().replace(/ /g, '-'),
  })
  return acc
}, {})
</script>

<template>
  <div>
    <UContainer>
      <UPage>
        <UPageHeader title="Script Registry" description="The registry is a collection of third-party scripts with out-of-the-box composable and component integrations for Nuxt Scripts." />
        <UPageBody>
          <p class="mb-5">
            To learn more about these scripts, please read the <NuxtLink to="/docs/guides/registry-scripts" class="underline text-primary">
              Registry Scripts
            </NuxtLink> documentation.
          </p>
          <div class="space-y-10">
            <div v-for="(scripts, category) in scriptsCategories" :key="category">
              <div class="mb-5">
                <h2 class="text-2xl mb-1 font-bold">
                  {{ categories[category].label }}
                </h2>
                <p class="text-gray-500 text-sm">
                  {{ categories[category].description }}
                </p>
              </div>
              <div class="flex flex-wrap gap-4">
                <NuxtLink v-for="(script, key) in scripts" :key="key" :to="`/scripts/${category}/${script.key}`">
                  <UCard class="min-w-[120px] text-center hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                    <div v-if="script.logo" class="mb-2">
                      <template v-if="typeof script.logo !== 'string'">
                        <div class="logo h-10 w-auto block dark:hidden" v-html="script.logo.light" />
                        <div class="logo h-10 w-auto hidden dark:block" v-html="script.logo.dark" />
                      </template>
                      <div v-else-if="script.logo.startsWith('<svg')" class="logo h-10 w-auto" v-html="script.logo" />
                      <img v-else class="h-10 w-auto mx-auto logo" :src="script.logo">
                    </div>
                    <div class="text-gray-500 text-sm font-semibold">
                      {{ script.label }}
                    </div>
                  </UCard>
                </NuxtLink>
              </div>
            </div>
          </div>
          <div class="mt-10">
            <p>Looking for a missing integration?</p>
            <div class="mt-2">
              <UButton
                to="https://github.com/nuxt/scripts/issues/new"
                target="_blank"
                icon="i-simple-icons-github"
                color="white"
                size="lg"
              >
                Suggest a new script
              </UButton>
            </div>
          </div>
        </UPageBody>
      </UPage>
    </UContainer>
  </div>
</template>

<style scoped>
.logo svg {
  max-height: 100%;
  max-width: 100%;
  height: auto;
  width: auto;
  display: block;
  margin: 0 auto;
}
</style>
