import {defineScriptPreset} from "../util";
import { Ref } from 'vue'
import { watch, isRef } from 'vue'

export const ScriptPresetLoadManual = (load: Promise<void> | Ref<boolean>) => defineScriptPreset({
  name: 'load-manual',
  setup(ctx) {
    ctx.loadPromise = !isRef(load) ? Promise.resolve(load) : new Promise((resolve) => {
      watch(load, (value) => {
        if (value)
          resolve()
      })
    })
  },
})
