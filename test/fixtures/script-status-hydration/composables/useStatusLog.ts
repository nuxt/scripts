import type { Ref } from 'vue'
import { watch } from 'vue'

declare global {
  interface Window {
    __statusLog?: Record<string, string[]>
  }
}

/** Record every value a `status` watcher sees, so a test can read the sequence. */
export function useStatusLog(name: string, status: Ref<string>) {
  if (import.meta.server)
    return
  const log = ((window.__statusLog ||= {})[name] ||= [])
  watch(status, value => log.push(value), { immediate: true })
}
