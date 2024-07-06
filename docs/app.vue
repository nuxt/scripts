<script setup lang="ts">
import type { ParsedContent } from '@nuxt/content/dist/runtime/types'

const { data: navigation } = await useAsyncData('navigation', () => fetchContentNavigation())
const { data: files } = useLazyFetch<ParsedContent[]>('/api/search.json', {
  default: () => [],
  server: false,
})

const route = useRoute()
provide('navigation', computed(() => {
  return route.path.startsWith('/docs') ? navigation.value?.[0]?.children : navigation.value?.[1]?.children || []
}))
provide('topGuides', computed(() => {
  return navigation.value?.[0]?.children.find(nav => nav.title === 'Guides')?.children || []
}))
</script>

<template>
  <div class="bg-white dark:bg-gray-950">
    <Header />

    <UMain>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UMain>

    <Footer />

    <ClientOnly>
      <LazyUContentSearch :files="files" :navigation="navigation" />
    </ClientOnly>

    <UNotifications />
  </div>
</template>

<style>
body {
  font-family: 'Inter var experimental', 'Inter var', 'Inter', sans-serif;
}
</style>
