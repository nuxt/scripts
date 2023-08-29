import NuxtScripts from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtScripts,
  ],
  scripts: {
    globals: {
      fathom: {
        site: 'test123',
      },
    },
  },
})
