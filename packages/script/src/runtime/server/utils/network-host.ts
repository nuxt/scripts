import type { LookupFunction } from 'node:net'
import { runtime } from 'std-env'

const LOCAL_HOST_SUFFIXES = [
  'home',
  'internal',
  'lan',
  'local',
  'localdomain',
  'localhost',
]

interface NetworkAddress {
  address: string
  family: 4 | 6
}

type ResolveNetworkHostname = (
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

function parseIPv4(hostname: string): [number, number, number, number] | undefined {
  const parts = hostname.split('.')
  if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part)))
    return
  const octets = parts.map(Number)
  return octets.every(octet => octet >= 0 && octet <= 255)
    ? octets as [number, number, number, number]
    : undefined
}

function isPublicIPv4([a, b, c]: [number, number, number, number]): boolean {
  return a !== 0
    && a !== 10
    && a !== 127
    && !(a === 100 && b >= 64 && b <= 127)
    && !(a === 169 && b === 254)
    && !(a === 172 && b >= 16 && b <= 31)
    && !(a === 192 && b === 0 && c === 0)
    && !(a === 192 && b === 0 && c === 2)
    && !(a === 192 && b === 88 && c === 99)
    && !(a === 192 && b === 168)
    && !(a === 198 && (b === 18 || b === 19))
    && !(a === 198 && b === 51 && c === 100)
    && !(a === 203 && b === 0 && c === 113)
    && a < 224
}

function isPublicIPv6(hostname: string): boolean {
  const groups = hostname.split(':')
  const firstGroup = Number.parseInt(groups[0] || '0', 16)
  if (!Number.isInteger(firstGroup) || firstGroup < 0x2000 || firstGroup > 0x3FFF)
    return false
  // Documentation, Teredo, and 6to4 ranges can encode or route to non-public targets.
  const secondGroup = Number.parseInt(groups[1] || '0', 16)
  return !(firstGroup === 0x2001 && (secondGroup === 0 || secondGroup === 0xDB8))
    && firstGroup !== 0x2002
}

/** Reject hostnames that directly address local, private, link-local, or reserved networks. */
export function isPublicNetworkHostname(input: string): boolean {
  const hostname = input
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .split('%', 1)[0]!
    .replace(/\.$/, '')
  if (!hostname)
    return false

  const ipv4 = parseIPv4(hostname)
  if (ipv4)
    return isPublicIPv4(ipv4)
  if (hostname.includes(':'))
    return isPublicIPv6(hostname)

  const labels = hostname.split('.')
  if (labels.length < 2)
    return false
  const suffix = labels.at(-1)!
  return !LOCAL_HOST_SUFFIXES.includes(suffix)
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

/** Create a Node fetch dispatcher whose socket lookup validates and pins every DNS answer. */
export async function createPublicNetworkDispatcher(resolveHostnameOverride?: ResolveNetworkHostname): Promise<PublicNetworkDispatcher> {
  if (runtime !== 'node')
    return { fetch: globalThis.fetch, close: async () => {} }

  // Loaded only on Node. Other runtimes keep their platform fetch behavior;
  // call sites still reject direct non-public hostnames before fetching.
  const { Agent, fetch } = await import('undici')
  let resolveHostname = resolveHostnameOverride
  if (!resolveHostname) {
    const { lookup } = await import('node:dns')
    resolveHostname = (hostname, callback) => lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
      callback(error, addresses as NetworkAddress[])
    })
  }
  const dispatcher = new Agent({
    connect: {
      lookup: createPublicNetworkLookup(resolveHostname),
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
