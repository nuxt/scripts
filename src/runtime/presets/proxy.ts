import {defineScriptPreset} from "../util";
import { withQuery } from 'ufo'

export const ScriptPresetProxy = () => defineScriptPreset({
  name: 'proxy',
  transform(script) {
    if(script.src) {
      script.src = withQuery(`/api/__nuxt_script__/proxy`, {
        src: encodeURIComponent(script.src),
      })
    }
  }
})
