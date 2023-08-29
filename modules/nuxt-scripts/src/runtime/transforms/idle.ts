import { defineScriptTransform } from '../util'
import { onNuxtReady } from '#imports'

export function LoadIdle() {
  return defineScriptTransform({
    name: 'idle',
    transform(_, ctx) {
    // client must be resolved client-side
      ctx.mode = 'client'
      // avoid rendering on server
      ctx.loadPromise = new Promise(resolve => onNuxtReady(resolve))
    },
  })
}
