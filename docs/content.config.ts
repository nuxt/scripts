import { defineCollection, defineContentConfig } from '@nuxt/content'
import { asSeoCollection } from '@nuxtjs/seo/content'
import { resolve } from 'pathe'

export default defineContentConfig({
  collections: {
    docs: defineCollection(asSeoCollection({
      type: 'page', // partial
      source: {
        include: '**/*.md',
        cwd: resolve('./content/docs'),
        prefix: `/docs`,
      },
    })),
    scripts: defineCollection(asSeoCollection({
      type: 'page', // partial
      source: {
        include: '**/*.md',
        cwd: resolve('./content/scripts'),
        prefix: `/scripts`,
      },
    })),
    snippets: defineCollection({
      type: 'page', // partial
      source: {
        include: '**/*.md',
        cwd: resolve('./content/snippets'),
      },
    }),
  },
})
