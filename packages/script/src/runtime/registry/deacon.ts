import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { DeaconOptions } from './schemas'

export { DeaconOptions }

export type DeaconInput = RegistryScriptInput<typeof DeaconOptions, false, false>

export interface DeaconUser {
  /** Your app's id for them. */
  id?: string | number
  email?: string
  name?: string
}

export interface DeaconApi {
  /** Open the chat. */
  open: () => void
  /** Close the chat. */
  close: () => void
  /** Open the chat if it is closed, and close it if it is open. */
  toggle: () => void
  /** Load the chat window in the background, so it opens without a wait. */
  preload: () => void
  /**
   * Tell Deacon what the page has learned about the visitor since it loaded, such as their
   * plan. Merges over `context`. A null value removes that key, and `null` clears it all.
   */
  setContext: (values: Record<string, string | number | boolean | null> | null) => void
  /**
   * Tell Deacon who is logged in, so the team sees their name on the conversation and they
   * don't have to type their email to get a reply. Replaces the whole identity, and `null`
   * says nobody is logged in. Deacon does not verify it.
   */
  identify: (user: DeaconUser | null) => void
  /** Send a goal, one of the moments named on Analytics › Website, with optional details. */
  track: (name: string, props?: Record<string, string | number | boolean>) => void
}

declare global {
  interface Window {
    Deacon: DeaconApi
  }
}

export function useScriptDeacon<T extends DeaconApi>(_options?: DeaconInput) {
  return useRegistryScript<T, typeof DeaconOptions>('deacon', options => ({
    scriptInput: {
      'src': 'https://heydeacon.com/widget/v1/loader.js',
      'data-key': options.key,
      'data-context': options.context ? JSON.stringify(options.context) : undefined,
      // The loader checks hasAttribute(), and unhead renders `false` as "false", so the
      // opt-out is written as '' or left out, never as a boolean.
      'data-no-page-views': options.pageViews === false ? '' : undefined,
      // loader.js is served without an Access-Control-Allow-Origin header, so the
      // crossorigin="anonymous" unhead adds by default would have the browser block it.
      'crossorigin': false,
    },
    schema: import.meta.dev ? DeaconOptions : undefined,
    scriptOptions: {
      // The loader assigns window.Deacon synchronously as it runs, so the API exists
      // by the time the load event fires.
      use() {
        return window.Deacon
      },
    },
  }), _options)
}
