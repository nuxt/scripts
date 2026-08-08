import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { DeskCrewOptions } from './schemas'

export { DeskCrewOptions }

export type DeskCrewInput = RegistryScriptInput<typeof DeskCrewOptions, false, false>

export interface DeskCrewIdentity {
  /** A signed identity token minted by your backend. */
  token: string
}

export interface DeskCrewEmbedOptions {
  /** Target element, or a selector for it. */
  el: string | HTMLElement
  /** Board slug, defaults to the `board` option. */
  board?: string
  /** Path the portal is mounted under, defaults to the current pathname. */
  basePath?: string
  /** Which portal view to open first. */
  view?: string
  theme?: 'light' | 'dark'
}

export interface DeskCrewChangelogOptions {
  /** `'inline'` requires `selector`. */
  mode?: 'inline' | 'floating'
  selector?: string
  basePath?: string
  position?: 'left' | 'right'
}

export interface DeskCrewSurveyOptions {
  /** Reserved. Surveys are opt in and may only be invoked once per page. */
  [key: string]: unknown
}

export interface DeskCrewApi {
  /** Open the support panel. */
  open: () => void
  /** Close the support panel. */
  close: () => void
  /** Attach a signed identity token to the current session. */
  identify: (identity: DeskCrewIdentity) => void
  /** Mount the embedded support portal into an element. May only be called once per page. */
  embed: (options: DeskCrewEmbedOptions) => void
  /** Mount the changelog widget. May only be called once per page. */
  changelog: (options?: DeskCrewChangelogOptions) => void
  /** Show an eligible survey. Opt in, may only be called once per page. */
  surveys: (options?: DeskCrewSurveyOptions) => void
  /** Report an error to Signals. No-op unless the workspace has error capture enabled. */
  captureError: (error: unknown, context?: Record<string, any>) => void
}

declare global {
  interface Window {
    DeskCrew: DeskCrewApi
  }
}

export function useScriptDeskCrew<T extends DeskCrewApi>(_options?: DeskCrewInput) {
  return useRegistryScript<T, typeof DeskCrewOptions>('deskcrew', options => ({
    scriptInput: {
      'src': 'https://deskcrew.io/desk.js',
      'data-key': options.widgetKey,
      // `|| undefined` on every optional: with envDefaults an unset field resolves to
      // '', and unhead would then render an empty data-board="" onto the tag. Same
      // guard umami-analytics uses.
      'data-board': options?.board || undefined,
      'data-color': options?.color || undefined,
      'data-position': options?.position || undefined,
      'data-greeting': options?.greeting || undefined,
      'data-launcher': options?.launcher || undefined,
    },
    schema: import.meta.dev ? DeskCrewOptions : undefined,
    scriptOptions: {
      // `use()` rather than `resolve({ waitFor })`. desk.js is one synchronous IIFE:
      // the queue stub and the real API are assigned at the same nesting level with no
      // async boundary between them, so the API exists by the time the load event that
      // use() waits on fires. The script also assigns its methods onto the stub rather
      // than replacing the object, so window.DeskCrew keeps a single identity for the
      // life of the page and a handle taken at any point stays live.
      use() {
        return window.DeskCrew
      },
    },
  }), _options)
}
