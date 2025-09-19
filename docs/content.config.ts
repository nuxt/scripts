import { defineCollection, defineContentConfig } from '@nuxt/content'
import { asSeoCollection } from '@nuxtjs/seo/content'
import { resolve } from 'pathe'

export default defineContentConfig({
  collections: {
    docs: defineCollection(asSeoCollection({
      type: 'page',
      source: {
        include: '**/*.md',
        cwd: resolve('./content'),
      },
    })),
    snippets: defineCollection({
      type: 'page', // partial
      source: {
        include: '**/*.md',
        cwd: resolve('./snippets'),
      },
    }),
  },
})
