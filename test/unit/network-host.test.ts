import { describe, expect, it, vi } from 'vitest'
import { createPublicNetworkDispatcher, createPublicNetworkLookup, isPrivateNetworkResolutionError, isPublicNetworkHostname } from '../../packages/script/src/runtime/server/utils/network-host'

describe('public network hostname boundary', () => {
  it.each([
    'localhost',
    'api.localhost',
    'router.local',
    '127.0.0.1',
    '10.0.0.1',
    '100.64.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.1.1',
    '[::1]',
    '[fc00::1]',
    '[fe80::1]',
    '[::ffff:127.0.0.1]',
    '[2001:db8::1]',
  ])('rejects local or non-public target %s', (hostname) => {
    expect(isPublicNetworkHostname(hostname)).toBe(false)
  })

  it.each([
    'cdn.example.com',
    '8.8.8.8',
    '[2606:4700:4700::1111]',
  ])('accepts public target %s', (hostname) => {
    expect(isPublicNetworkHostname(hostname)).toBe(true)
  })

  it('pins a validated public DNS result into the connection lookup', async () => {
    const resolveHostname = vi.fn((_hostname, callback) => callback(null, [
      { address: '2606:4700:4700::1111', family: 6 as const },
      { address: '1.1.1.1', family: 4 as const },
    ]))
    const lookup = createPublicNetworkLookup(resolveHostname)

    const result = await new Promise<Array<{ address: string, family: number }>>((resolve, reject) => {
      lookup('one.one.one.one', { all: true }, (error, addresses) => {
        if (error)
          reject(error)
        else
          resolve(addresses as Array<{ address: string, family: number }>)
      })
    })

    expect(result).toEqual([
      { address: '2606:4700:4700::1111', family: 6 },
      { address: '1.1.1.1', family: 4 },
    ])
    expect(resolveHostname).toHaveBeenCalledOnce()
  })

  it('rejects a hostname when any DNS result can reach a non-public address', async () => {
    const lookup = createPublicNetworkLookup((_hostname, callback) => callback(null, [
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]))

    const error = await new Promise<Error | null>((resolve) => {
      lookup('rebind.example.com', {}, error => resolve(error))
    })

    expect(error).toMatchObject({ code: 'ERR_NUXT_SCRIPTS_PRIVATE_ADDRESS' })
  })

  it('uses the validated lookup for the actual Node fetch connection', async () => {
    const network = await createPublicNetworkDispatcher((_hostname, callback) => callback(null, [
      { address: '127.0.0.1', family: 4 },
    ]))

    try {
      const error = await network.fetch('http://rebind.example.com').catch(error => error)
      expect(isPrivateNetworkResolutionError(error)).toBe(true)
    }
    finally {
      await network.close()
    }
  })
})
