<script setup lang="ts">
definePageMeta({
  layout: 'docs',
})

const route = useRoute()
const { toc } = useAppConfig()

const [{ data: page }, { data: surround }] = await Promise.all([
  useAsyncData(`docs-${route.path}`, () => queryCollection('docs').path(route.path).first()),
  useAsyncData(`docs-${route.path}-surround`, () => queryCollectionItemSurroundings('docs', route.path, {
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
  }),
])
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

const headline = computed(() => findPageHeadline(page.value))

const links = computed(() => [toc?.bottom?.edit && {
  icon: 'i-heroicons-pencil-square',
  label: 'Edit this page',
  to: `${toc.bottom.edit}/${page?.value?.id}`,
  target: '_blank',
}, ...(toc?.bottom?.links || [])].filter(Boolean))
</script>

<template>
  <UPage>
    <UPageHeader :title="page.title" :description="page.description" :links="page.links" :headline="headline" />

    <UPageBody prose class="dark:text-gray-300 dark:prose-pre:!bg-gray-800/60">
      <ContentRenderer v-if="page.body" :value="page" />

      <hr v-if="surround?.length">

      <UContentSurround :surround="surround" />
    </UPageBody>

    <template v-if="page.toc !== false" #right>
      <UContentToc :title="toc?.title" :links="page.body?.toc?.links" class="bg-white dark:bg-gray-950">
        <template v-if="toc?.bottom" #bottom>
          <div class="hidden lg:block space-y-6" :class="{ '!mt-6': page.body?.toc?.links?.length }">
            <UDivider v-if="page.body?.toc?.links?.length" type="dashed" />
            <Ads class="mb-5" />
            <UPageLinks :title="toc.bottom.title" :links="links" />
          </div>
        </template>
      </UContentToc>
    </template>
  </UPage>
</template>
