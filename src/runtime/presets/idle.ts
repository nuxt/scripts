import {defineScriptPreset} from "../util";

export const ScriptPresetLoadIdle = () => defineScriptPreset({
  name: 'idle',
  transform(_, ctx) {
    // client must be resolved client-side
    ctx.mode = 'client'
    // avoid rendering on server
    ctx.loadPromise = new Promise((resolve) => {
      // idle callback
      window.requestIdleCallback(() => {
        resolve()
      })
    })
  }
})
