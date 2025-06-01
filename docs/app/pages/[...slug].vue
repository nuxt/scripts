<script setup lang="ts">
definePageMeta({
  layout: 'docs',
})

const route = useRoute()
const docData = useAsyncData(`docs-${route.path}`, () => queryCollection('docs').path(route.path).first())
const surroundData = useAsyncData(`docs-${route.path}-surround`, () => queryCollectionItemSurroundings('docs', route.path, {
  fields: ['title', 'description', 'path'],
}), {
  transform(items) {
    return items.map((m) => {
      return {
        ...m,
        _path: m.path,
      }
    })
  },
})

await Promise.all([docData, surroundData])
const page = docData.data
const surround = surroundData.data
const surroundIntroduction = [
  undefined,
  {
    description: 'Learn how to create a Nuxt Scripts project or add it to your current Nuxt project.',
    path: '/docs/getting-started/installation',
    stem: 'docs/1.getting-started/2.installation',
    title: 'Installation',
    _path: '/docs/getting-started/installation',
  },
]

if (!page.value)
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

useSeoMeta({
  title: page.value.title,
  description: page.value.description,
})

defineOgImageComponent('Docs', {
  title: page.value.title,
  description: page.value.description,
})
</script>

<template>
  <UPage>
    <UPageHeader :title="page.title" :description="page.description" :links="page.links" />

    <UPageBody prose class="dark:text-gray-300 dark:prose-pre:!bg-gray-800/60">
      <ContentRenderer v-if="page.body" :value="page" />

      <hr v-if="surround?.length || page.path === '/docs/getting-started'">

      <UContentSurround :surround="surround" />
	  <UContentSurround v-if="page.path === '/docs/getting-started'" :surround="surroundIntroduction" />
    </UPageBody>

    <!--    <template v-if="page.toc !== false" #right> -->
    <!--      <UContentToc :title="toc?.title" :links="page.body?.toc?.links" class="bg-white dark:bg-gray-950"> -->
    <!--        <template v-if="toc?.bottom" #bottom> -->
    <!--          <div class="hidden lg:block space-y-6" :class="{ '!mt-6': page.body?.toc?.links?.length }"> -->
    <!--            <UDivider v-if="page.body?.toc?.links?.length" type="dashed" /> -->
    <!--            <Ads class="mb-5" /> -->
    <!--            <UPageLinks :title="toc.bottom.title" :links="links" /> -->
    <!--          </div> -->
    <!--        </template> -->
    <!--      </UContentToc> -->
    <!--    </template> -->
  </UPage>
</template>
