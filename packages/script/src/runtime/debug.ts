declare const __NUXT_SCRIPTS_DEBUG__: boolean

export const debugEnabled: boolean
  = typeof __NUXT_SCRIPTS_DEBUG__ !== 'undefined' && __NUXT_SCRIPTS_DEBUG__
