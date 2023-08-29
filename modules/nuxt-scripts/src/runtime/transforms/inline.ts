import type { Script as RawScript } from '@unhead/schema'
import { setHeader } from 'h3'
import { defineScriptTransform } from '../util'

export function InlineSrc() {
  return defineScriptTransform({
    name: 'inline-external-script',
    async transform(script, { status, requestEvent }) {
      if (!script.src) {
        console.warn('[nuxt-script]: script has no src')
        return
      }
      const scriptProps = await $fetch('/api/__nuxt_script__/inline', {
        accept: 'application/javascript',
        query: {
          src: encodeURIComponent(script.src),
          integrity: script.integrity ? encodeURIComponent(script.integrity) : undefined,
        },
      }).catch((error) => {
        status.value = 'error'
      }) as RawScript
      Object.assign(script, scriptProps)
      if (script.integrity) {
        if (process.server && requestEvent)
        // we need to use a CSP header for inline scripts
          setHeader(requestEvent, process.dev ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy', `base-uri 'self'; script-src 'self' '${script.integrity}'`)
        delete script.integrity
      }

      delete script.src
    },
  })
}
