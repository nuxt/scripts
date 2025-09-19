import { useRegistryScript } from '../utils'
import { minLength, object, string, pipe } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

type ClarityFunctions = ((fn: 'start', options: { content: boolean, cookies: string[], dob: number, expire: number, projectId: string, upload: string }) => void)
  & ((fn: 'identify', id: string, session?: string, page?: string, userHint?: string) => Promise<{
    id: string
    session: string
    page: string
    userHint: string
  }>)
  & ((fn: 'consent', enabled?: boolean) => void)
  & ((fn: 'set', key: any, value: any) => void)
  & ((fn: 'event', value: any) => void)
  & ((fn: 'upgrade', upgradeReason: any) => void)
  & ((fn: string, ...args: any[]) => void)

export interface ClarityApi {
  clarity: ClarityFunctions & {
    q: any[]
    v: string
  }
}

declare global {
  interface Window extends ClarityApi {}
}

export const ClarityOptions = object({
  /**
   * The Clarity token.
   */
  id: pipe(string(), minLength(10)),
})

export type ClarityInput = RegistryScriptInput<typeof ClarityOptions>

export function useScriptClarity<T extends ClarityApi>(
  _options?: ClarityInput,
) {
  return useRegistryScript<T, typeof ClarityOptions>('clarity',
    options => ({
      scriptInput: {
        src: `https://www.clarity.ms/tag/${options.id}`,
      },
      schema: import.meta.dev ? ClarityOptions : undefined,
      scriptOptions: {
        use() {
          return {
            // @ts-expect-error untyped
            clarity: Object.assign(function (...params) {
              const clarity = window.clarity
              // @ts-expect-error untyped
              return clarity.apply(this, params)
            }, window.clarity),
          }
        },
      },
      clientInit: import.meta.server
        ? undefined
        : () => {
            window.clarity = window.clarity || function (...params: any[]) {
              (window.clarity.q = window.clarity.q || []).push(params)
            }
          },
    }),
    _options,
  )
}
