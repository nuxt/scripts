import type { LookupFunction } from 'node:net'
import { createNetworkDispatcher } from '#nuxt-scripts/network-dispatcher'
import { isPublicNetworkHostname } from './network-hostname'

export { isPublicNetworkHostname } from './network-hostname'

export interface NetworkAddress {
  address: string
  family: 4 | 6
}

export type ResolveNetworkHostname = (
  hostname: string,
  callback: (error: Error | null, addresses: NetworkAddress[]) => void,
) => void

type NetworkLookup = (
  hostname: string,
  options: { all?: boolean, family?: number | 'IPv4' | 'IPv6' },
  callback: (error: NodeJS.ErrnoException | null, address: string | NetworkAddress[], family?: number) => void,
) => void

export interface PublicNetworkDispatcher {
  fetch: typeof globalThis.fetch
  close: () => Promise<void>
}

export type CreateNetworkDispatcher = (
  createLookup: (resolveHostname: ResolveNetworkHostname) => LookupFunction,
  resolveHostnameOverride?: ResolveNetworkHostname,
) => Promise<PublicNetworkDispatcher>

/** Close a dispatcher without replacing the request or stream error already in flight. */
export async function closePublicNetworkDispatcher(
  dispatcher: PublicNetworkDispatcher | undefined,
  primaryError?: unknown,
): Promise<void> {
  if (!dispatcher)
    return
  await dispatcher.close().catch((cleanupError) => {
    if (primaryError !== undefined) {
      if (primaryError && typeof primaryError === 'object')
        Object.assign(primaryError, { cleanupError })
      return
    }
    throw cleanupError
  })
}

/** Resolve once inside the socket connection, reject mixed/private answers, then pin the selected address. */
export function createPublicNetworkLookup(resolveHostname: ResolveNetworkHostname): LookupFunction {
  const networkLookup: NetworkLookup = (hostname, options, callback) => {
    resolveHostname(hostname, (error, addresses) => {
      if (error) {
        callback(error, '')
        return
      }
      if (!addresses.length || addresses.some(({ address }) => !isPublicNetworkHostname(address))) {
        callback(Object.assign(new Error('Upstream hostname resolved to a non-public address'), {
          code: 'ERR_NUXT_SCRIPTS_PRIVATE_ADDRESS',
        }), '')
        return
      }

      if (options.all) {
        callback(null, addresses)
        return
      }

      const requestedFamily = options.family === 'IPv4'
        ? 4
        : options.family === 'IPv6'
          ? 6
          : options.family === 4 || options.family === 6 ? options.family : undefined
      const selected = addresses.find(({ family }) => family === requestedFamily) ?? addresses[0]!
      callback(null, selected.address, selected.family)
    })
  }
  return networkLookup as LookupFunction
}

/** Create a host fetch implementation that validates and pins every DNS answer when Node permits it. */
export async function createPublicNetworkDispatcher(resolveHostnameOverride?: ResolveNetworkHostname): Promise<PublicNetworkDispatcher> {
  return createNetworkDispatcher(createPublicNetworkLookup, resolveHostnameOverride)
}

/** Detect the tagged DNS policy error through fetch/ofetch cause wrappers. */
export function isPrivateNetworkResolutionError(error: unknown): boolean {
  let current = error
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth++) {
    if ((current as NodeJS.ErrnoException).code === 'ERR_NUXT_SCRIPTS_PRIVATE_ADDRESS')
      return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}
