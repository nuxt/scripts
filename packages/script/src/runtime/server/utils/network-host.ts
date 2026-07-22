const LOCAL_HOST_SUFFIXES = [
  'home',
  'internal',
  'lan',
  'local',
  'localdomain',
  'localhost',
]

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
