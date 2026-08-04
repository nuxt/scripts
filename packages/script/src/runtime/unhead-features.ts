declare const __NUXT_SCRIPTS_UNHEAD_SOURCELESS__: boolean

export function isUnheadSourceLessScriptLoaderEnabled(): boolean {
  return typeof __NUXT_SCRIPTS_UNHEAD_SOURCELESS__ !== 'undefined'
    && __NUXT_SCRIPTS_UNHEAD_SOURCELESS__
}
