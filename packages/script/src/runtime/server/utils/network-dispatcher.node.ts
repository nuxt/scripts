import type { CreateNetworkDispatcher, NetworkAddress } from './network-host'
import { lookup } from 'node:dns'
import { Agent, fetch } from 'undici'

export const createNetworkDispatcher: CreateNetworkDispatcher = async (createLookup, resolveHostnameOverride) => {
  const resolveHostname = resolveHostnameOverride || ((hostname, callback) => {
    lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
      callback(error, addresses as NetworkAddress[])
    })
  })
  const dispatcher = new Agent({
    connect: {
      lookup: createLookup(resolveHostname),
    },
  })
  return {
    fetch: ((input, init) => fetch(input as string | URL, {
      ...(init as unknown as NonNullable<Parameters<typeof fetch>[1]>),
      dispatcher,
    }) as unknown as Promise<Response>) as typeof globalThis.fetch,
    close: () => dispatcher.close(),
  }
}
