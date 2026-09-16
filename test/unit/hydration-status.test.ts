import { describe, expect, it } from 'vitest'
import { watch } from 'vue'
import { createHydrationStatus } from '../../packages/script/src/runtime/utils/hydration-status'

describe('createHydrationStatus', () => {
  it('reports the server status while the live status changes', () => {
    const { status } = createHydrationStatus('loading', 'awaitingLoad')
    expect(status.value).toBe('awaitingLoad')

    status.value = 'loaded'
    expect(status.value).toBe('awaitingLoad')
  })

  it('reports the live status after release and notifies watchers once', () => {
    const { status, release } = createHydrationStatus('loading', 'awaitingLoad')
    const seen: string[] = []
    watch(status, value => seen.push(value), { flush: 'sync', immediate: true })

    status.value = 'loaded'
    release()
    status.value = 'removed'

    expect(seen).toEqual(['awaitingLoad', 'loaded', 'removed'])
  })

  it('does not notify on release when the live status equals the server status', () => {
    const { status, release } = createHydrationStatus('loading', 'loading')
    const seen: string[] = []
    watch(status, value => seen.push(value), { flush: 'sync' })

    release()
    release()

    expect(seen).toEqual([])
    expect(status.value).toBe('loading')
  })

  it('notifies watchers of every live transition after release', () => {
    const { status, release } = createHydrationStatus('awaitingLoad', 'awaitingLoad')
    release()
    const seen: string[] = []
    watch(status, value => seen.push(value), { flush: 'sync' })

    status.value = 'loading'
    status.value = 'loading'
    status.value = 'loaded'

    expect(seen).toEqual(['loading', 'loaded'])
  })
})
