import type { UseScriptContext } from '#nuxt-scripts/types'
import type { UsercentricsApi, UsercentricsCmp, UsercentricsConsent } from '../registry/usercentrics'
import { logger } from '../logger'
import { createAbortablePromise, createAbortError } from './abortable-promise'

interface UsercentricsEventTarget {
  __ucCmp?: UsercentricsCmp
  addEventListener: Window['addEventListener']
  removeEventListener: Window['removeEventListener']
}

type HookAppUnmount = (callback: () => void) => () => void

export function attachUsercentricsConsent<T extends UsercentricsApi>(
  instance: UseScriptContext<T, UsercentricsConsent>,
  target: UsercentricsEventTarget,
  hookAppUnmount: HookAppUnmount,
): void {
  if (instance.consent)
    return

  let readyApi: UsercentricsCmp | undefined
  let readyPromise: Promise<UsercentricsCmp> | undefined
  let readyController: AbortController | undefined
  let stopAppUnmount = () => {}
  let disposed = true
  const cleanupReadyListener = () => {
    if (disposed)
      return
    disposed = true
    readyController?.abort()
    readyController = undefined
    const stop = stopAppUnmount
    stopAppUnmount = () => {}
    stop()
  }
  const armReadyListener = () => {
    readyApi = undefined
    readyPromise = undefined
    readyController = new AbortController()
    disposed = false
    stopAppUnmount = hookAppUnmount(cleanupReadyListener)
  }
  const whenReady = (): Promise<UsercentricsCmp> => {
    const controller = readyController
    if (disposed || !controller)
      return Promise.reject(createAbortError('Usercentrics readiness wait was aborted'))
    if (readyApi)
      return Promise.resolve(readyApi)
    if (!readyPromise) {
      // Install the event listener before checking isInitialized() so an
      // event fired during that async check cannot be missed.
      readyPromise = createAbortablePromise<UsercentricsCmp>((resolve) => {
        const onReady = () => {
          const api = target.__ucCmp
          if (!api)
            return
          readyApi = api
          resolve(api)
        }
        target.addEventListener('UC_CMP_API_READY', onReady)
        const api = target.__ucCmp
        if (api?.isInitialized) {
          Promise.resolve()
            .then(() => api.isInitialized())
            .then((initialized) => {
              if (initialized && !controller.signal.aborted)
                onReady()
            })
            .catch((error) => {
              // Some bootstrap stubs throw until the ready event; the event
              // listener remains the authoritative readiness signal.
              if (!controller.signal.aborted)
                logger.debug('[usercentrics] Waiting for UC_CMP_API_READY after isInitialized() failed', error)
            })
        }
        return () => target.removeEventListener('UC_CMP_API_READY', onReady)
      }, {
        signal: controller.signal,
        abortMessage: 'Usercentrics readiness wait was aborted',
      })
    }
    return readyPromise
  }

  armReadyListener()
  const originalRemove = instance.remove
  const originalLoad = instance.load
  instance.remove = () => {
    cleanupReadyListener()
    return originalRemove()
  }
  instance.load = () => {
    if (disposed)
      armReadyListener()
    return originalLoad()
  }

  instance.consent = {
    whenReady,
    onConsentChange(cb) {
      const handler = (event: Event) => cb((event as CustomEvent).detail, event)
      target.addEventListener('UC_UI_CMP_EVENT', handler)
      return () => target.removeEventListener('UC_UI_CMP_EVENT', handler)
    },
    showFirstLayer: () => target.__ucCmp?.showFirstLayer?.(),
    showSecondLayer: () => target.__ucCmp?.showSecondLayer?.(),
    acceptAll: () => target.__ucCmp?.acceptAllConsents?.(),
    denyAll: () => target.__ucCmp?.denyAllConsents?.(),
  }
}
