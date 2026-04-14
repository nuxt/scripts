import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { ClarityOptions } from './schemas'

export { ClarityOptions }

type ClarityFunctions = ((fn: 'start', options?: { content?: boolean, cookies?: string[], dob?: number, expire?: number, projectId?: string, upload?: string }) => void)
  & ((fn: 'identify', id: string, session?: string, page?: string, userHint?: string) => Promise<{
    id: string
    session: string
    page: string
    userHint: string
  }>)
  & ((fn: 'consent', enabled?: boolean | Record<string, string>) => void)
  & ((fn: 'set', key: string, value: string | string[]) => void)
  & ((fn: 'event', value: string) => void)
  & ((fn: 'upgrade', upgradeReason: string) => void)
  & ((fn: (string & {}), ...args: any[]) => void)

export interface ClarityApi {
  clarity: ClarityFunctions & {
    q: any[]
    v: string
  }
}

declare global {
  interface Window extends ClarityApi {}
}

export type ClarityInput = RegistryScriptInput<typeof ClarityOptions>

export function useScriptClarity<T extends ClarityApi>(
  _options?: ClarityInput,
) {
  return useRegistryScript<T, typeof ClarityOptions>('clarity', options => ({
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
  }), _options)
}
