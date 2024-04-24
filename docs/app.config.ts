export default defineAppConfig({
  ui: {
    primary: 'green',
    gray: 'slate',
    footer: {
      bottom: {
        left: 'text-sm text-gray-500 dark:text-gray-400',
        wrapper: 'border-t border-gray-200 dark:border-gray-800',
      },
    },
    variables: {
      dark: {
        background: 'var(--color-gray-950)',
      },
    },
  },
  seo: {
    siteName: 'Nuxt Scripts',
  },
  header: {
    links: [{
      'icon': 'i-simple-icons-github',
      'to': 'https://github.com/nuxt/scripts',
      'target': '_blank',
      'aria-label': 'Nuxt Scripts',
    }],
  },
  toc: {
    title: 'Table of Contents',
    bottom: {
      title: 'Community',
      edit: 'https://github.com/nuxt/scripts/edit/main/docs/content',
      links: [{
        icon: 'i-heroicons-star',
        label: 'Star on GitHub',
        to: 'https://github.com/nuxt/scripts',
        target: '_blank',
      }],
    },
  },
})
