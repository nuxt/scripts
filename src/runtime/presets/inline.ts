import {Script as RawScript} from "@unhead/schema";
import {setHeader} from "h3";
import {defineScriptPreset} from "../util";

export const ScriptPresetInline = () => defineScriptPreset({
  name: 'inline-external-script',
  async transform(script, { status, requestEvent }) {
    const scriptProps = await $fetch('/api/__nuxt_script__/inline', {
      accept: 'application/javascript',
      query: {
        src: encodeURIComponent(script.src),
        integrity: encodeURIComponent(script.integrity),
      }
    }).catch((error) => {
      status.value = 'error'
    }) as RawScript
    Object.assign(script, scriptProps)
    if (script.integrity) {
      if (process.server)
        // we need to use a CSP header for inline scripts
        setHeader(requestEvent, process.dev ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy', `base-uri 'self'; script-src 'self' '${script.integrity}'`)
      delete script.integrity
    }

    delete script.src
  }
})
