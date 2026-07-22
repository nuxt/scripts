import { describe, expect, it } from 'vitest'
import { isPublicNetworkHostname } from '../../packages/script/src/runtime/server/utils/network-host'

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
})
