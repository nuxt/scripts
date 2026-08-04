import { existsSync, readFileSync } from 'node:fs'

const SOURCE_LESS_SCRIPT_LOADER_TYPE = /\bUseScriptLoaderInput\b/

export function hasUnheadSourceLessScriptLoader(typesSource: string): boolean {
  return SOURCE_LESS_SCRIPT_LOADER_TYPE.test(typesSource)
}

export function hasUnheadSourceLessScriptLoaderFile(typesPath: string | null): boolean {
  if (!typesPath || !existsSync(typesPath))
    return false
  try {
    return hasUnheadSourceLessScriptLoader(readFileSync(typesPath, 'utf8'))
  }
  catch {
    // An unreadable optional peer must retain the compatibility implementation.
    return false
  }
}
