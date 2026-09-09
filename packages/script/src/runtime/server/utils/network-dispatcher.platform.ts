import type { PublicNetworkDispatcher } from './network-host'

export const createNetworkDispatcher: () => Promise<PublicNetworkDispatcher> = async () => ({
  // workerd's native fetch throws `TypeError: Illegal invocation` when a
  // detached reference is called as a method (e.g. `dispatcher.fetch(...)`),
  // so pin the receiver before handing the function to callers.
  fetch: globalThis.fetch.bind(globalThis),
  close: async () => {},
})
