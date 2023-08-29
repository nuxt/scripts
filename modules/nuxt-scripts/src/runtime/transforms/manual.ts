import { isRef, watch } from 'vue'
import type { Ref } from 'vue'
import { defineScriptTransform } from '../util'

export function LoadManual(load: Promise<void> | Ref<boolean>) {
  return defineScriptTransform({
    name: 'load-manual',
    setup(ctx) {
      ctx.loadPromise = !isRef(load)
        ? Promise.resolve(load)
        : new Promise((resolve) => {
          watch(load, (value) => {
            if (value)
              resolve()
          })
        })
    },
  })
}
