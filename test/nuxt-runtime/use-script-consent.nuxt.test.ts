import type { ConsentAdapter, ConsentState } from '../../packages/script/src/runtime/types'
import { useScriptConsent, useScriptTriggerConsent } from '#imports'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'

function getPromiseState(promise: Promise<any>) {
  const temp = {}
  return Promise.race([promise, temp])
    .then(value => value === temp ? 'pending' : 'fulfilled')
    .catch(() => 'rejected')
}

function nextTick() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

describe('useScriptConsent', () => {
  it('default state applies immediately', () => {
    const consent = useScriptConsent({
      default: { ad_storage: 'denied', analytics_storage: 'denied' },
    })
    expect(consent.state.value.ad_storage).toBe('denied')
    expect(consent.state.value.analytics_storage).toBe('denied')
    expect(consent.consented.value).toBe(false)
  })

  it('accept() grants all categories and resolves promise', async () => {
    const consent = useScriptConsent({
      default: { ad_storage: 'denied', analytics_storage: 'denied' },
    })
    expect(await getPromiseState(consent)).toBe('pending')
    consent.accept()
    await nextTick()
    expect(consent.consented.value).toBe(true)
    expect(consent.state.value.ad_storage).toBe('granted')
    expect(consent.state.value.analytics_storage).toBe('granted')
    expect(await getPromiseState(consent)).toBe('fulfilled')
  })

  it('revoke() denies all categories', async () => {
    const consent = useScriptConsent({ default: { ad_storage: 'granted' } })
    consent.accept()
    await nextTick()
    expect(consent.consented.value).toBe(true)
    consent.revoke()
    await nextTick()
    expect(consent.consented.value).toBe(false)
    expect(consent.state.value.ad_storage).toBe('denied')
  })

  it('update() merges partial state', async () => {
    const consent = useScriptConsent({
      default: { ad_storage: 'denied', analytics_storage: 'denied' },
    })
    consent.update({ analytics_storage: 'granted' })
    await nextTick()
    expect(consent.state.value.ad_storage).toBe('denied')
    expect(consent.state.value.analytics_storage).toBe('granted')
    expect(consent.consented.value).toBe(true)
  })

  it('batches multiple update() calls in the same tick', async () => {
    const consent = useScriptConsent({ default: { ad_storage: 'denied' } })
    const calls: ConsentState[] = []
    const adapter: ConsentAdapter = {
      applyDefault: () => {},
      applyUpdate: (s) => {
        calls.push({ ...s })
      },
    }
    consent.register(adapter, {})
    consent.update({ ad_storage: 'granted' })
    consent.update({ analytics_storage: 'granted' })
    consent.update({ ad_user_data: 'granted' })
    await nextTick()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
    })
  })

  it('register fires applyDefault with current state', () => {
    const consent = useScriptConsent({
      default: { ad_storage: 'denied', analytics_storage: 'granted' },
    })
    let defaulted: ConsentState | undefined
    consent.register({
      applyDefault: (s) => {
        defaulted = s
      },
      applyUpdate: () => {},
    }, {})
    expect(defaulted).toMatchObject({ ad_storage: 'denied', analytics_storage: 'granted' })
  })

  it('binary compat: consent ref gate resolves promise', async () => {
    const gate = ref(false)
    const consent = useScriptConsent({ consent: gate })
    expect(await getPromiseState(consent)).toBe('pending')
    gate.value = true
    await nextTick()
    expect(await getPromiseState(consent)).toBe('fulfilled')
    expect(consent.consented.value).toBe(true)
  })

  it('binary compat: postConsentTrigger function', async () => {
    const gate = ref(false)
    let triggered = false
    const consent = useScriptConsent({
      consent: gate,
      postConsentTrigger: () => new Promise<void>(resolve => setTimeout(() => {
        triggered = true
        resolve()
      }, 20)),
    })
    gate.value = true
    await nextTick()
    expect(await getPromiseState(consent)).toBe('pending')
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(triggered).toBe(true)
    expect(await getPromiseState(consent)).toBe('fulfilled')
  })
})

describe('useScriptTriggerConsent migration shim', () => {
  it('behaves identically to useScriptConsent', async () => {
    const consent = useScriptTriggerConsent()
    expect(await getPromiseState(consent)).toBe('pending')
    consent.accept()
    await nextTick()
    expect(await getPromiseState(consent)).toBe('fulfilled')
    expect(consent.consented.value).toBe(true)
  })
})
