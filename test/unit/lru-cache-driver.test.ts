import { describe, expect, it } from 'vitest'
import lruCacheDriver from '../../packages/script/src/runtime/server/utils/lru-cache-driver'

describe('lruCacheDriver', () => {
  it('evicts the least recently used entry past max', () => {
    const driver = lruCacheDriver({ max: 2 })
    driver.setItem('a', '1')
    driver.setItem('b', '2')
    driver.getItem('a')
    driver.setItem('c', '3')

    expect(driver.getKeys().sort()).toEqual(['a', 'c'])
    expect(driver.getItem('b')).toBeNull()
  })

  it('skips entries larger than maxEntrySize, counting the key', () => {
    const driver = lruCacheDriver({ max: 10, maxSize: 100, maxEntrySize: 12 })
    driver.setItemRaw('small', new Uint8Array(4))
    driver.setItemRaw('large', new Uint8Array(16))

    expect(driver.hasItem('small')).toBe(true)
    expect(driver.hasItem('large')).toBe(false)
  })
})
