import { describe, expect, it } from 'vitest'
import { scriptMeta } from '../../src/script-meta'
import { getScriptStats } from '../../src/stats'

describe('getScriptStats', () => {
  it('returns stats for all registry entries', async () => {
    const stats = await getScriptStats()
    expect(stats.length).toBeGreaterThan(0)
    // every entry has required fields
    for (const s of stats) {
      expect(s.id).toBeTruthy()
      expect(s.label).toBeTruthy()
      expect(s.category).toBeTruthy()
      expect(Array.isArray(s.scripts)).toBe(true)
      expect(typeof s.totalTransferKb).toBe('number')
      expect(typeof s.totalDecodedKb).toBe('number')
      expect(Array.isArray(s.trackedData)).toBe(true)
      expect(typeof s.hasBundling).toBe('boolean')
      expect(typeof s.hasProxy).toBe('boolean')
      expect(Array.isArray(s.domains)).toBe(true)
      expect(typeof s.endpoints).toBe('number')
      expect(['full', 'partial', 'none', 'unknown']).toContain(s.privacyLevel)
      expect(['cdn', 'npm', 'dynamic']).toContain(s.loadingMethod)
    }
  })

  it('scripts with proxy have privacy and domains', async () => {
    const stats = await getScriptStats()
    const proxied = stats.filter(s => s.hasProxy)
    expect(proxied.length).toBeGreaterThan(0)
    for (const s of proxied) {
      expect(s.privacy).not.toBeNull()
      expect(s.privacyLevel).not.toBe('unknown')
    }
  })

  it('every scriptMeta key maps to a stat entry', async () => {
    const stats = await getScriptStats()
    const ids = new Set(stats.map(s => s.id))
    for (const key of Object.keys(scriptMeta)) {
      expect(ids.has(key)).toBe(true)
    }
  })

  it('trackedData is populated from scriptMeta', async () => {
    const stats = await getScriptStats()
    const ga = stats.find(s => s.id === 'googleAnalytics')
    expect(ga).toBeDefined()
    expect(ga!.trackedData).toContain('page-views')
    expect(ga!.trackedData).toContain('events')
  })
})
