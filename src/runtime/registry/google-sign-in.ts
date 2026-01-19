import { useRegistryScript } from '#nuxt-scripts/utils'
import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { object, string, optional, boolean, array, union, literal } from '#nuxt-scripts-validator'

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
// eslint-disable-next-line
declare namespace google {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace accounts {
    // eslint-disable-next-line @typescript-eslint/no-namespace
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

export const GoogleSignInOptions = object({
  clientId: string(),
  // Auto-select credentials if only one is available
  autoSelect: optional(boolean()),
  // Context for One Tap (signin, signup, or use)
  context: optional(union([literal('signin'), literal('signup'), literal('use')])),
  // FedCM API support (Privacy Sandbox) - mandatory from August 2025
  useFedcmForPrompt: optional(boolean()),
  // Cancel One Tap if user clicks outside
  cancelOnTapOutside: optional(boolean()),
  // UX mode: popup or redirect
  uxMode: optional(union([literal('popup'), literal('redirect')])),
  // Login URI for redirect flow
  loginUri: optional(string()),
  // ITP (Intelligent Tracking Prevention) support
  itpSupport: optional(boolean()),
  // Allowed parent origins for iframe embedding
  allowedParentOrigin: optional(union([string(), array(string())])),
  // Hosted domain - restrict to specific Google Workspace domain
  hd: optional(string()),
})

export type GoogleSignInInput = RegistryScriptInput<typeof GoogleSignInOptions>

export function useScriptGoogleSignIn<T extends GoogleSignInApi>(_options?: GoogleSignInInput) {
  return useRegistryScript<T, typeof GoogleSignInOptions>(_options?.key || 'googleSignIn', () => {
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
          },
    }
  }, _options)
}
