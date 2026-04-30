import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import { useRegistryScript } from '#nuxt-scripts/utils'
import { GoogleSignInOptions } from './schemas'

// Credential response from One Tap or button flow
export interface CredentialResponse {
  credential: string // JWT token
  select_by: 'auto' | 'user' | 'user_1tap' | 'user_2tap' | 'btn' | 'btn_confirm' | 'btn_add_session' | 'btn_confirm_add_session'
  clientId?: string
}

// Google Accounts ID configuration
export interface IdConfiguration {
  client_id: string
  auto_select?: boolean
  callback?: (response: CredentialResponse) => void
  login_uri?: string
  native_callback?: (response: CredentialResponse) => void
  cancel_on_tap_outside?: boolean
  prompt_parent_id?: string
  nonce?: string
  context?: 'signin' | 'signup' | 'use'
  state_cookie_domain?: string
  ux_mode?: 'popup' | 'redirect'
  allowed_parent_origin?: string | string[]
  intermediate_iframe_close_callback?: () => void
  itp_support?: boolean
  login_hint?: string
  hd?: string
  use_fedcm_for_prompt?: boolean
}

// Button configuration for personalized button
export interface GsiButtonConfiguration {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  logo_alignment?: 'left' | 'center'
  width?: string | number
  locale?: string
  click_listener?: () => void
  // FedCM support for button flow (mandatory from August 2025)
  use_fedcm?: boolean
}

// Moment notification types
export type MomentType
  = | 'display'
    | 'skipped'
    | 'dismissed'

export interface MomentNotification {
  isDisplayMoment: () => boolean
  isDisplayed: () => boolean
  isNotDisplayed: () => boolean
  getNotDisplayedReason: () =>
    | 'browser_not_supported'
    | 'invalid_client'
    | 'missing_client_id'
    | 'opt_out_or_no_session'
    | 'secure_http_required'
    | 'suppressed_by_user'
    | 'unregistered_origin'
    | 'unknown_reason'
  isSkippedMoment: () => boolean
  getSkippedReason: () =>
    | 'auto_cancel'
    | 'user_cancel'
    | 'tap_outside'
    | 'issuing_failed'
  isDismissedMoment: () => boolean
  getDismissedReason: () =>
    | 'credential_returned'
    | 'cancel_called'
    | 'flow_restarted'
  getMomentType: () => MomentType
}

// Revocation response
export interface RevocationResponse {
  successful: boolean
  error?: string
}

// Use namespace declaration like google-maps to avoid conflicts
declare namespace google {
  export namespace accounts {
    export namespace id {
      export function initialize(config: IdConfiguration): void
      export function prompt(momentListener?: (notification: MomentNotification) => void): void
      export function renderButton(parent: HTMLElement, options: GsiButtonConfiguration): void
      export function disableAutoSelect(): void
      export function cancel(): void
      export function revoke(hint: string, callback: (response: RevocationResponse) => void): void
    }
  }
}

type AccountsNamespace = typeof google.accounts
export interface GoogleSignInApi {
  accounts: AccountsNamespace
}

export { GoogleSignInOptions }

export type GoogleSignInInput = RegistryScriptInput<typeof GoogleSignInOptions>

/**
 * Helpers attached to the `useScriptGoogleSignIn()` instance.
 *
 * They merge schema options (passed to `useScriptGoogleSignIn(...)`) with the
 * arguments below, ensure `accounts.id.initialize()` is called at most once
 * across the page lifecycle (avoids the error Google emits on re-init after a
 * button is rendered), and wait for the script to load.
 */
export interface GoogleSignInHelpers {
  /**
   * Initialize Google Identity Services. Schema options are used as defaults;
   * pass a callback (and any other non-serializable config) here. Subsequent
   * calls are a no-op so this is safe to invoke from a remounting component.
   */
  initialize: (config?: Partial<IdConfiguration>) => void
  /**
   * Render a personalized Google Sign-In button. Auto-initializes if needed.
   * Safe to re-render on navigation or locale change.
   */
  renderButton: (parent: HTMLElement, config?: GsiButtonConfiguration) => void
  /**
   * Show the One Tap prompt. Auto-initializes if needed.
   */
  prompt: (listener?: (notification: MomentNotification) => void) => void
}

export function useScriptGoogleSignIn<T extends GoogleSignInApi>(_options?: GoogleSignInInput): UseScriptContext<T> & GoogleSignInHelpers {
  const instance = useRegistryScript<T, typeof GoogleSignInOptions>(_options?.key || 'googleSignIn', (options) => {
    return {
      scriptInput: {
        src: 'https://accounts.google.com/gsi/client',
        // Performance best practice: async + defer to prevent render blocking
        defer: true,
        // Google's script doesn't support CORS
        crossorigin: false,
      },
      schema: import.meta.dev ? GoogleSignInOptions : undefined,
      scriptOptions: {
        use() {
          return {
            accounts: (window as any).google?.accounts as AccountsNamespace,
          }
        },
      },
      clientInit: import.meta.server
        ? undefined
        : () => {
            // Initialize minimal window.google namespace
            // The actual initialization happens via the initialize() method
            // to give developers control over when One Tap appears
            const w = window as any
            w.google = w.google || {}
            w.google.accounts = w.google.accounts || {}
            w.google.accounts.id = w.google.accounts.id || {}
            // Stash schema-derived config so the helpers can find it after HMR / remount
            const key = _options?.key || 'googleSignIn'
            w.__nuxtScriptsGsi = w.__nuxtScriptsGsi || {}
            w.__nuxtScriptsGsi[key] = w.__nuxtScriptsGsi[key] || { initialized: false }
            w.__nuxtScriptsGsi[key].schemaConfig = mapSchemaToIdConfig(options as GoogleSignInInput)
          },
    }
  }, _options) as UseScriptContext<T> & GoogleSignInHelpers

  // Helpers must be attached on both server and client — destructuring in
  // <script setup> runs during SSR, so the methods need to exist even though
  // the work only happens on the client (onLoaded only fires there).
  const key = _options?.key || 'googleSignIn'
  interface GsiState {
    initialized: boolean
    schemaConfig: Partial<IdConfiguration>
    // Runtime config supplied via `initialize()` is stashed separately so that
    // a `renderButton()`/`prompt()` call which beats the user's `initialize()`
    // call doesn't lock in a callback-less config (GIS only honors the first
    // `initialize`, so a missing `callback` would silently break popup/One Tap).
    runtimeConfig: Partial<IdConfiguration>
  }
  const getState = (): GsiState => {
    const w = (import.meta.client ? window : globalThis) as any
    w.__nuxtScriptsGsi = w.__nuxtScriptsGsi || {}
    w.__nuxtScriptsGsi[key] = w.__nuxtScriptsGsi[key] || {
      initialized: false,
      schemaConfig: mapSchemaToIdConfig(_options),
      runtimeConfig: {},
    }
    return w.__nuxtScriptsGsi[key] as GsiState
  }
  const ensureInit = (extra?: Partial<IdConfiguration>): boolean => {
    if (!import.meta.client)
      return false
    const state = getState()
    // Google logs a warning if `initialize()` runs more than once. We always
    // call it at most once per page lifecycle; to update config you must
    // reload the page (or use a unique `key`).
    if (state.initialized)
      return true
    const merged = { ...state.schemaConfig, ...state.runtimeConfig, ...extra } as IdConfiguration
    if (!merged.client_id)
      return false
    // Popup (default) and One Tap require a JS callback to deliver the
    // credential. Defer initialization until one is provided so we don't burn
    // the single allowed `initialize()` on a config that can never sign in.
    if (merged.ux_mode !== 'redirect' && typeof merged.callback !== 'function')
      return false
    const gid = (window as any).google?.accounts?.id
    if (!gid)
      return false
    gid.initialize(merged)
    state.initialized = true
    return true
  }

  instance.initialize = (config?: Partial<IdConfiguration>) => {
    // Stash runtime config eagerly so a renderButton/prompt that runs after
    // this point still picks up the callback once the script loads.
    if (config)
      Object.assign(getState().runtimeConfig, config)
    instance.onLoaded(() => {
      ensureInit()
    })
  }
  instance.renderButton = (parent: HTMLElement, config: GsiButtonConfiguration = {}) => {
    instance.onLoaded(({ accounts }) => {
      // Skip if init couldn't run yet (missing client_id or callback) so we
      // don't trigger GSI's "Failed to render button before calling initialize".
      if (!ensureInit())
        return
      accounts.id.renderButton(parent, config)
    })
  }
  instance.prompt = (listener?: (notification: MomentNotification) => void) => {
    instance.onLoaded(({ accounts }) => {
      if (!ensureInit())
        return
      accounts.id.prompt(listener)
    })
  }

  return instance
}

function mapSchemaToIdConfig(options?: GoogleSignInInput): Partial<IdConfiguration> {
  if (!options)
    return {}
  const cfg: Partial<IdConfiguration> = {}
  if (options.clientId)
    cfg.client_id = options.clientId
  if (options.autoSelect != null)
    cfg.auto_select = options.autoSelect
  if (options.context)
    cfg.context = options.context
  if (options.useFedcmForPrompt != null)
    cfg.use_fedcm_for_prompt = options.useFedcmForPrompt
  if (options.cancelOnTapOutside != null)
    cfg.cancel_on_tap_outside = options.cancelOnTapOutside
  if (options.uxMode)
    cfg.ux_mode = options.uxMode
  if (options.loginUri)
    cfg.login_uri = options.loginUri
  if (options.itpSupport != null)
    cfg.itp_support = options.itpSupport
  if (options.allowedParentOrigin)
    cfg.allowed_parent_origin = options.allowedParentOrigin
  if (options.hd)
    cfg.hd = options.hd
  return cfg
}
