import { describe, expect, it } from 'vitest'
import { registry } from '../../packages/script/src/registry'

describe('google maps request boundaries', () => {
  it('does not expose billable server proxy handlers', async () => {
    const googleMaps = (await registry()).find(script => script.registryKey === 'googleMaps')

    expect(googleMaps).toBeDefined()
    expect(googleMaps?.serverHandlers).toBeUndefined()
  })
})
