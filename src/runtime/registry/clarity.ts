import { useRegistryScript } from '../utils'
import { minLength, object, string, pipe } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

/**
 * <script type="text/javascript">
 *     (function(c,l,a,r,i,t,y){
 *         c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
 *         t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
 *         y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
 *     })(window, document, "clarity", "script", "mpy5c6k7xi");
 * </script>
 */

type ClarityFunctions = ((fn: 'start', options: { content: boolean, cookies: string[], dob: number, expire: number, projectId: string, upload: string }) => void)
  & ((fn: 'identify', id: string, session?: string, page?: string, userHint?: string) => Promise<{
    id: string
    session: string
    page: string
    userHint: string
  }>)
  & ((fn: 'consent') => void)
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
  return useRegistryScript<T, typeof ClarityOptions>(
    'clarity',
    options => ({
      scriptInput: {
        src: `https://www.clarity.ms/tag/${options.id}`,
      },
      schema: import.meta.dev ? ClarityOptions : undefined,
      scriptOptions: {
        use() {
          return { clarity: window.clarity }
        },
      },
      clientInit: import.meta.server
        ? undefined
        : () => {
            window.clarity = window.clarity || function () {
              (window.clarity.q = window.clarity.q || []).push(arguments)
            }
          },
    }),
    _options,
  )
}
