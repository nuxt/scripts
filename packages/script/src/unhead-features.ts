const SOURCE_LESS_SCRIPT_LOADER_TYPE = /\bUseScriptLoaderInput\b/

export function hasUnheadSourceLessScriptLoader(typesSource: string): boolean {
  return SOURCE_LESS_SCRIPT_LOADER_TYPE.test(typesSource)
}
