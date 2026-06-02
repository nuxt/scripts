// `enforce: 'pre'` so the listener is registered before the module's scripts:init plugin
// runs and fires the hook. Proves runtime mutation of globals per instance (issue #759).
export default defineNuxtPlugin({
  enforce: 'pre',
  setup(nuxtApp) {
    nuxtApp.hooks.hook('scripts:globals', (globals) => {
      globals.scrads.src = 'https://scrads.example/from-hook.js'
      // Removing an entry must skip its registration without crashing setup.
      delete globals.legacy
    })
  },
})
