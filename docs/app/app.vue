<script setup lang="ts">
function recursiveContentFix(data: any) {
  if (data.id && !data.path) {
    data.path = data.id
  }
  data.to = data.path
  data.label = data.title
  if (data.children) {
    data.children = data.children.map((nav) => {
      return recursiveContentFix(nav)
    })
  }
  return data
}

const { data: navigation } = await useAsyncData('navigation', () => queryCollectionNavigation('docs'), {
  transform(data) {
    return data.map(data => recursiveContentFix(data))
  },
})

const { data: files } = await useAsyncData('search', () => queryCollectionSearchSections('docs'), {
  transform(data) {
    return data.map(data => recursiveContentFix(data))
  },
})

useHead({
  templateParams: {
    separator: '·',
  },
})

provide('navigation', computed(() => {
  return navigation.value || []
}))
provide('topGuides', computed(() => {
  return (navigation.value || [])?.[0]?.children?.find(nav => nav.title === 'Guides')?.children || []
}))
</script>

<template>
  <UApp>
    <div class="bg-white dark:bg-gray-950">
      <NuxtLoadingIndicator color="#FFF" />

      <Header />

      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>

      <Footer />

      <ClientOnly>
        <LazyContentSearch
          :files="files"
          :navigation="navigation"
          :fuse="{ resultLimit: 42 }"
        />
      </ClientOnly>
    </div>
  </UApp>
</template>

<style>
body {
  font-family: 'Inter var experimental', 'Inter var', 'Inter', sans-serif;
}
</style>
