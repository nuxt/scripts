import type { Script as RawScript } from '@unhead/schema'
import { defineScriptTransform } from '../util'
import { useInlineAsset } from '#imports'

export function InlineSrc() {
  return defineScriptTransform({
    name: 'inline-external-script',
    async transform(script, { status, requestEvent }) {
      const scriptProps = script.src
        ? await useInlineAsset(script.src)
          .catch((error) => {
            status.value = 'error'
          }) as RawScript
        : {}
      Object.assign(script, scriptProps)
      // TODO handle integrity checks
      if (script.integrity) {
        if (process.server && requestEvent)
          // we need to use a CSP header for inline scripts
          // setHeader(requestEvent, process.dev ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy', `base-uri 'self'; script-src 'self' '${script.integrity}'`)
          delete script.integrity
      }

      delete script.src
    },
  })
}
