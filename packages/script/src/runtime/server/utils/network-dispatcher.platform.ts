import type { CreateNetworkDispatcher } from './network-host'

export const createNetworkDispatcher: CreateNetworkDispatcher = async () => ({
  fetch: globalThis.fetch,
  close: async () => {},
})
