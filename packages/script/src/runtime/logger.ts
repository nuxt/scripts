import { createConsola } from 'consola'
import { debugEnabled } from './debug'

export const logger = createConsola({
  // 4 = debug, 3 = info (consola defaults). Lift the threshold so `logger.debug`
  // fires when debug is opted-in at build time or in dev.
  level: debugEnabled ? 4 : 3,
  defaults: {
    tag: 'nuxt-scripts',
  },
})
