<script setup lang="ts">
const { data: navigation } = await useAsyncData('navigation', () => queryCollectionNavigation('docs'), {
  transform(data) {
    return data?.[0]?.children.map((nav) => {
      return {
        ...nav,
        children: nav.children.map((item) => {
          return {
            ...item,
            to: item.path,
          }
        }),
      }
    })
  },
})
const { data: scriptsNavigation } = await useAsyncData('script-navigation', () => queryCollectionNavigation('scripts'), {
  transform(data) {
    return data?.[0]?.children.map((nav) => {
      return {
        ...nav,
        children: nav.children.map((item) => {
          return {
            ...item,
            to: item.path,
          }
        }),
      }
    })
  },
})

const { data: files } = useLazyAsyncData('search', () => queryCollectionSearchSections('docs'), {
  server: false,
})
const { data: scriptFiles } = useLazyAsyncData('search-scripts', () => queryCollectionSearchSections('scripts'), {
  server: false,
})

provide('navigation', computed(() => {
  return navigation.value || []
}))
provide('topGuides', computed(() => {
  return (navigation.value || []).find(nav => nav.title === 'Guides')?.children || []
}))

provide('scripts-navigation', computed(() => {
  return scriptsNavigation.value || []
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
      <LazyUContentSearch
        :files="[files, scriptFiles].flat()"
        :navigation="[navigation, scriptsNavigation].flat()"
        :fuse="{ resultLimit: 42 }"
      />
    </ClientOnly>

    <UNotifications />
  </div>
</template>

<style>
body {
  font-family: 'Inter var experimental', 'Inter var', 'Inter', sans-serif;
}
</style>
