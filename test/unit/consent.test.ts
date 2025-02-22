// @vitest-environment happy-dom
import { ref } from 'vue'
import { useScriptTriggerConsent } from '../../src/runtime/composables/useScriptTriggerConsent'

function getPromiseState(promise: Promise<any>) {
  const temp = {}
  return Promise.race([promise, temp])
    .then(value => value === temp ? 'pending' : 'fulfilled')
    .catch(() => 'rejected')
}

describe('consent', () => {
  it('promise post consent trigger', async () => {
    const consent = ref(false)
    const triggerCalled = ref(false)
    const p = useScriptTriggerConsent({
      consent,
      postConsentTrigger: () => new Promise<void>(resolve =>
        setTimeout(resolve, 30),
      ).then(() => (triggerCalled.value = true)),
    })

    // Check initial state
    expect(await getPromiseState(p)).toBe('pending')

    // wait 50ms
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(await getPromiseState(p)).toBe('pending')
    expect(triggerCalled.value).toBe(false)

    consent.value = true

    // await next tick
    await new Promise(resolve => setTimeout(resolve, 0))

    // only loads 30 ms after
    expect(await getPromiseState(p)).toBe('pending')

    // await 50ms
    await new Promise(resolve => setTimeout(resolve, 50))

    // should be fulfilled
    expect(await getPromiseState(p)).toBe('fulfilled')

    expect(triggerCalled.value).toBe(true)
  }, 60000)
  it('function post consent trigger', async () => {
    const consent = ref(false)
    const triggerCalled = ref(false)
    const p = useScriptTriggerConsent({
      consent,
      postConsentTrigger: (fn) => {
        // load in 30ms
        setTimeout(() => {
          fn()
          triggerCalled.value = true
        }, 30)
      },
    })

    // Check initial state
    expect(await getPromiseState(p)).toBe('pending')

    // wait 50ms
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(await getPromiseState(p)).toBe('pending')
    expect(triggerCalled.value).toBe(false)

    consent.value = true

    // await next tick
    await new Promise(resolve => setTimeout(resolve, 35))

    // should be fulfilled
    expect(await getPromiseState(p)).toBe('fulfilled')

    expect(triggerCalled.value).toBe(true)
  })
})
