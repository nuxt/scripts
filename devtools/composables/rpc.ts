import { firstPartyData, syncScripts, version } from './state'

useDevtoolsConnection({
  onConnected: (client) => {
    client.host.nuxt.hooks.hook('scripts:updated', (ctx: any) => {
      syncScripts(ctx.scripts)
    })
    version.value = client.host.nuxt.$config.public['nuxt-scripts'].version
    firstPartyData.value = client.host.nuxt.$config.public['nuxt-scripts-devtools'] || null
    syncScripts(client.host.nuxt._scripts || {})
  },
})
