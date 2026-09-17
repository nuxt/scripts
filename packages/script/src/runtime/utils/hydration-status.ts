import type { UseScriptStatus } from 'unhead/scripts'
import type { Ref } from 'vue'
import { customRef } from 'vue'

/**
 * Payload key for the script statuses the server rendered.
 * The server writes only statuses other than `awaitingLoad`, so a page whose
 * scripts all wait for a client trigger adds nothing to the payload.
 */
export const SCRIPT_STATUS_PAYLOAD_KEY = '_scriptStatus'

export type ServerScriptStatuses = Record<string, UseScriptStatus>

export interface HydrationStatus {
  /** Reports the server status until `release()`, then the live status. */
  status: Ref<UseScriptStatus>
  release: () => void
}

/**
 * Create a status ref that agrees with the server-rendered HTML while the app hydrates.
 *
 * A client trigger can change the live status during setup, before hydration
 * compares the DOM. The live status still updates underneath, so the loader
 * starts at the same moment. Only the value that rendering and watchers read
 * waits for `release()`.
 */
export function createHydrationStatus(live: UseScriptStatus, server: UseScriptStatus): HydrationStatus {
  let value = live
  let held: UseScriptStatus | undefined = server
  let notify = () => {}
  const status = customRef<UseScriptStatus>((track, trigger) => {
    notify = trigger
    return {
      get() {
        track()
        return held ?? value
      },
      set(next) {
        const previous = value
        value = next
        if (held === undefined && next !== previous)
          trigger()
      },
    }
  })
  return {
    status,
    release() {
      if (held === undefined)
        return
      const shown = held
      held = undefined
      if (value !== shown)
        notify()
    },
  }
}
