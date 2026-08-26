import type { Ref } from 'vue'
import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import { joinURL } from 'ufo'
import { ref } from 'vue'
import { useRegistryScript } from '../utils'
import { TawkToOptions } from './schemas'

export { TawkToOptions }

export type TawkToInput = RegistryScriptInput<typeof TawkToOptions, false, false>

export type TawkToStatus = 'online' | 'away' | 'offline'
export type TawkToWindowType = 'inline' | 'embed'
export type TawkToWidgetPosition = 'br' | 'bl' | 'cr' | 'cl' | 'tr' | 'tl'

export interface TawkToVisitor {
  name?: string
  email?: string
  /** HMAC-SHA256 signature for Tawk's Secure Mode, generated server-side by the consumer. */
  hash?: string
}

/**
 * The `window.Tawk_API` surface, as exposed through `proxy`. `proxy` is
 * fire-and-forget: unhead's script proxy queues/replays calls but always
 * discards their return value, even once the script is fully loaded (and it
 * has no `set` trap, so plain property assignment through it goes nowhere).
 * That means only void-returning actions belong here - real getters and the
 * `visitor` setter live on `useScriptTawkTo()`'s own return value instead
 * (see `TawkToEvents`), backed directly by `window.Tawk_API`.
 * @see https://developer.tawk.to/jsapi/
 */
export interface TawkToApi {
  start: () => void
  shutdown: () => void
  maximize: () => void
  minimize: () => void
  toggle: () => void
  popup: () => void
  showWidget: () => void
  hideWidget: () => void
  toggleVisibility: () => void
  endChat: () => void

  getWindowType: () => TawkToWindowType
  getStatus: () => TawkToStatus
  isChatMaximized: () => boolean
  isChatMinimized: () => boolean
  isChatHidden: () => boolean
  isChatOngoing: () => boolean
  isVisitorEngaged: () => boolean
  /** Set by Tawk once the widget has finished loading. The embed writes a boolean (`!0`), not a number. */
  onLoaded?: boolean
  /** Set by Tawk before the widget begins loading. */
  onBeforeLoaded?: boolean
  widgetPosition: () => TawkToWidgetPosition

  visitor?: TawkToVisitor
  setAttributes: (attributes: Record<string, string>, callback?: (error: Error | null) => void) => void
  addEvent: (event: string, metadata?: Record<string, unknown>, callback?: (error: Error | null) => void) => void
  addTags: (tags: string[], callback?: (error: Error | null) => void) => void
  removeTags: (tags: string[], callback?: (error: Error | null) => void) => void
  switchWidget: (data: { propertyId: string, widgetId: string }, callback?: () => void) => void
}

declare global {
  interface Window {
    Tawk_API?: TawkToApi
    Tawk_LoadStart?: Date
  }
}

/**
 * The subset of `TawkToApi` that `proxy` actually exposes: the getters, the
 * `visitor` setter and the `onLoaded`/`onBeforeLoaded` flags are omitted since
 * none of them work through the fire-and-forget proxy (see `TawkToApi`'s doc
 * comment). They're still real members of the underlying `window.Tawk_API`
 * object, just not reachable via `proxy`.
 */
export type TawkToProxyApi = Omit<TawkToApi, 'getWindowType' | 'getStatus' | 'isChatMaximized' | 'isChatMinimized' | 'isChatHidden' | 'isChatOngoing' | 'isVisitorEngaged' | 'widgetPosition' | 'visitor' | 'onLoaded' | 'onBeforeLoaded'>

/**
 * Reactive state and typed event listeners bridged from the `window`
 * `CustomEvent`s Tawk's embed script dispatches (`tawkLoad`, `tawkStatusChange`, etc).
 * These aren't part of the documented `Tawk_API.onXxx = fn` callback-property API -
 * they're a separate, verified-in-the-browser signal the embed script also fires.
 */
export interface TawkToEvents {
  isHidden: Readonly<Ref<boolean>>
  isMinimized: Readonly<Ref<boolean>>
  isMaximized: Readonly<Ref<boolean>>
  /** The operator status Tawk reports (`getStatus()`) — not to be confused with `status`, the script's own load state. */
  chatStatus: Readonly<Ref<TawkToStatus>>
  unreadCount: Readonly<Ref<number>>

  // Getters, called directly against `window.Tawk_API` (see `TawkToProxyApi`'s
  // doc comment for why `proxy` can't carry these). `undefined` before the
  // widget has loaded; the four `isXxx` booleans default to `false` instead
  // since a definite "no" is a safe, honest answer before load.
  getWindowType: () => TawkToWindowType | undefined
  getStatus: () => TawkToStatus | undefined
  isChatMaximized: () => boolean
  isChatMinimized: () => boolean
  isChatHidden: () => boolean
  isChatOngoing: () => boolean
  isVisitorEngaged: () => boolean
  widgetPosition: () => TawkToWidgetPosition | undefined

  /**
   * Sets `Tawk_API.visitor` directly - assigning through `proxy.visitor` is a no-op
   * (no `set` trap). Pre-load only: Tawk honors `Tawk_API.visitor` before the embed
   * script loads, so a call after `onLoaded` warns and does nothing - use
   * `window.Tawk_API.setAttributes()` for post-load identity changes.
   */
  setVisitor: (data: TawkToVisitor) => void

  onLoad: (cb: () => void) => () => void
  onBeforeLoad: (cb: () => void) => () => void
  onStatusChange: (cb: (status: TawkToStatus) => void) => () => void
  onChatMaximized: (cb: () => void) => () => void
  onChatMinimized: (cb: () => void) => () => void
  onChatHidden: (cb: () => void) => () => void
  onChatStarted: (cb: () => void) => () => void
  onChatEnded: (cb: () => void) => () => void
  onPrechatSubmit: (cb: (data: Record<string, unknown>) => void) => () => void
  onOfflineSubmit: (cb: (data: Record<string, unknown>) => void) => () => void
  onChatMessageVisitor: (cb: (message: string) => void) => () => void
  onChatMessageAgent: (cb: (message: string) => void) => () => void
  onChatMessageSystem: (cb: (message: string) => void) => () => void
  onAgentJoinChat: (cb: (data: Record<string, unknown>) => void) => () => void
  onAgentLeaveChat: (cb: (data: Record<string, unknown>) => void) => () => void
  onChatSatisfaction: (cb: (satisfaction: number) => void) => () => void
  onVisitorNameChanged: (cb: (visitorName: string) => void) => () => void
  onFileUpload: (cb: (link: string) => void) => () => void
  onTagsUpdated: (cb: (data: Record<string, unknown>) => void) => () => void
  onUnreadCountChanged: (cb: (count: number) => void) => () => void
}

// One Tawk widget exists per page, so its derived state is a module-level
// singleton shared by every useScriptTawkTo() call - not one ref tree per
// call, and not Nuxt's useState() (nothing here is ever known during SSR).
const isHidden = ref(false)
const isMinimized = ref(false)
const isMaximized = ref(false)
const chatStatus = ref<TawkToStatus>('offline')
const unreadCount = ref(0)

function listen<D = void>(event: string, cb: (detail: D) => void): () => void {
  if (import.meta.server)
    return () => {}
  const handler = (e: Event) => cb((e as CustomEvent<D>).detail)
  window.addEventListener(event, handler)
  return () => window.removeEventListener(event, handler)
}

// Bridges the window CustomEvents into the refs above. Guarded so it only
// wires up once no matter how many times useScriptTawkTo() is called.
let stateBridged = false
function ensureStateBridge() {
  if (stateBridged)
    return
  stateBridged = true
  listen('tawkLoad', () => {
    isHidden.value = !!window.Tawk_API?.isChatHidden()
    isMinimized.value = !!window.Tawk_API?.isChatMinimized()
    isMaximized.value = !!window.Tawk_API?.isChatMaximized()
    chatStatus.value = window.Tawk_API?.getStatus() ?? 'offline'
  })
  listen<TawkToStatus>('tawkStatusChange', (detail) => {
    chatStatus.value = detail
  })
  listen('tawkChatHidden', () => {
    isHidden.value = true
  })
  listen('tawkChatMinimized', () => {
    isMinimized.value = true
    isMaximized.value = false
  })
  listen('tawkChatMaximized', () => {
    isMaximized.value = true
    isMinimized.value = false
  })
  listen<number>('tawkUnreadCountChanged', (detail) => {
    unreadCount.value = detail
  })
}

export function useScriptTawkTo<T extends TawkToProxyApi>(_options?: TawkToInput): UseScriptContext<T> & TawkToEvents {
  const instance = useRegistryScript<T, typeof TawkToOptions>('tawkTo', options => ({
    scriptInput: {
      src: joinURL('https://embed.tawk.to', options.propertyId, options.widgetId),
      async: true,
      crossorigin: 'anonymous',
    },
    schema: import.meta.dev ? TawkToOptions : undefined,
    scriptOptions: {
      resolve({ waitFor }) {
        if (window.Tawk_API?.onLoaded)
          return window.Tawk_API as TawkToProxyApi as T

        return waitFor<T>((resolve, reject) => {
          const stop = listen('tawkLoad', () => {
            stop()
            if (window.Tawk_API)
              resolve(window.Tawk_API as TawkToProxyApi as T)
            else
              reject(new Error('[nuxt-scripts] Tawk.to reported ready without exposing window.Tawk_API'))
          })
          return stop
        })
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          window.Tawk_API = window.Tawk_API || {} as TawkToApi
          window.Tawk_LoadStart = new Date()
        },
  }), _options) as UseScriptContext<T> & TawkToEvents

  if (!import.meta.server)
    ensureStateBridge()

  // The refs are module-level singletons (see above); consumers only get the
  // Readonly<Ref<T>> view so mutation stays confined to the state bridge.
  instance.isHidden = isHidden
  instance.isMinimized = isMinimized
  instance.isMaximized = isMaximized
  instance.chatStatus = chatStatus
  instance.unreadCount = unreadCount
  instance.onLoad = cb => listen('tawkLoad', cb)
  instance.onBeforeLoad = cb => listen('tawkBeforeLoad', cb)
  instance.onStatusChange = cb => listen('tawkStatusChange', cb)
  instance.onChatMaximized = cb => listen('tawkChatMaximized', cb)
  instance.onChatMinimized = cb => listen('tawkChatMinimized', cb)
  instance.onChatHidden = cb => listen('tawkChatHidden', cb)
  instance.onChatStarted = cb => listen('tawkChatStarted', cb)
  instance.onChatEnded = cb => listen('tawkChatEnded', cb)
  instance.onPrechatSubmit = cb => listen('tawkPrechatSubmit', cb)
  instance.onOfflineSubmit = cb => listen('tawkOfflineSubmit', cb)
  instance.onChatMessageVisitor = cb => listen('tawkChatMessageVisitor', cb)
  instance.onChatMessageAgent = cb => listen('tawkChatMessageAgent', cb)
  instance.onChatMessageSystem = cb => listen('tawkChatMessageSystem', cb)
  instance.onAgentJoinChat = cb => listen('tawkAgentJoinChat', cb)
  instance.onAgentLeaveChat = cb => listen('tawkAgentLeaveChat', cb)
  instance.onChatSatisfaction = cb => listen('tawkChatSatisfaction', cb)
  instance.onVisitorNameChanged = cb => listen('tawkVisitorNameChanged', cb)
  instance.onFileUpload = cb => listen('tawkFileUpload', cb)
  instance.onTagsUpdated = cb => listen('tawkTagsUpdated', cb)
  instance.onUnreadCountChanged = cb => listen('tawkUnreadCountChanged', cb)

  // Called directly against window.Tawk_API rather than through `proxy`,
  // which discards every return value (see TawkToProxyApi's doc comment).
  instance.getWindowType = () => import.meta.server ? undefined : window.Tawk_API?.getWindowType()
  instance.getStatus = () => import.meta.server ? undefined : window.Tawk_API?.getStatus()
  instance.isChatMaximized = () => !import.meta.server && !!window.Tawk_API?.isChatMaximized()
  instance.isChatMinimized = () => !import.meta.server && !!window.Tawk_API?.isChatMinimized()
  instance.isChatHidden = () => !import.meta.server && !!window.Tawk_API?.isChatHidden()
  instance.isChatOngoing = () => !import.meta.server && !!window.Tawk_API?.isChatOngoing()
  instance.isVisitorEngaged = () => !import.meta.server && !!window.Tawk_API?.isVisitorEngaged()
  instance.widgetPosition = () => import.meta.server ? undefined : window.Tawk_API?.widgetPosition()
  instance.setVisitor = (data) => {
    if (import.meta.server)
      return
    // Before clientInit creates the stub, create or reuse it so the visitor is
    // not silently dropped - Tawk honors `Tawk_API.visitor` set pre-load.
    window.Tawk_API = window.Tawk_API || {} as TawkToApi
    // Tawk only honors `Tawk_API.visitor` before the embed script loads; after
    // `onLoaded`, identity changes must go through `setAttributes()` instead.
    if (window.Tawk_API.onLoaded) {
      console.warn('[nuxt-scripts] Tawk.to: setVisitor() only works before the widget loads. Tawk ignores it once onLoaded is set - use window.Tawk_API.setAttributes({ name, email, hash }) instead.')
      return
    }
    window.Tawk_API.visitor = data
  }

  return instance
}
