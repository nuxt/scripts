import type { ConsolaInstance } from 'consola'
import type { RegistryScript } from './runtime/types'

const UPPER_RE = /([A-Z])/g
const toScreamingSnake = (s: string) => s.replace(UPPER_RE, '_$1').toUpperCase()

const ENV_PREFIX = 'NUXT_PUBLIC_SCRIPTS_'
const GLOBALS_ENV_PREFIX = 'NUXT_PUBLIC_SCRIPTS_GLOBALS_'

function levenshtein(a: string, b: string): number {
  if (a === b)
    return 0
  if (!a.length)
    return b.length
  if (!b.length)
    return a.length
  const prev: number[] = []
  for (let j = 0; j <= b.length; j++) prev.push(j)
  for (let i = 1; i <= a.length; i++) {
    let prevDiag = prev[0]!
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!
      prev[j] = a[i - 1] === b[j - 1]
        ? prevDiag
        : Math.min(prevDiag, prev[j]!, prev[j - 1]!) + 1
      prevDiag = tmp
    }
  }
  return prev[b.length]!
}

/**
 * Warn for `NUXT_PUBLIC_SCRIPTS_*` env vars that don't map to a valid registry
 * key + field. Nuxt resolves env vars against runtimeConfig before modules run,
 * so a misspelled key (e.g. `NUXT_PUBLIC_SCRIPTS_MICROSOFT_CLARITY_ID` instead
 * of `NUXT_PUBLIC_SCRIPTS_CLARITY_ID`) is silently dropped with no error.
 */
export function validateScriptsEnvVars(
  scripts: RegistryScript[],
  enabledRegistryKeys: Set<string>,
  logger: ConsolaInstance,
  globalsKeys: string[] = [],
): void {
  // Configured `scripts.globals` keys — env vars NUXT_PUBLIC_SCRIPTS_GLOBALS_<KEY>_*
  // are validated against these (typo detection, suggestions). Globals are
  // schemaless so we can't validate the trailing field name.
  const validGlobalsByScreaming = new Map<string, string>()
  for (const k of globalsKeys)
    validGlobalsByScreaming.set(toScreamingSnake(k), k)
  // Build a map from screaming-snake registry key to its envDefaults fields
  const validByKey = new Map<string, { camel: string, fields: Set<string> }>()
  for (const s of scripts) {
    if (!s.registryKey || !s.envDefaults || !Object.keys(s.envDefaults).length)
      continue
    const screaming = toScreamingSnake(s.registryKey)
    const fields = new Set(Object.keys(s.envDefaults).map(toScreamingSnake))
    validByKey.set(screaming, { camel: s.registryKey, fields })
  }

  if (!validByKey.size)
    return

  const allValidEnvKeys: string[] = []
  for (const [screaming, { fields }] of validByKey) {
    for (const f of fields)
      allValidEnvKeys.push(`${ENV_PREFIX}${screaming}_${f}`)
  }

  for (const envKey of Object.keys(process.env)) {
    if (!envKey.startsWith(ENV_PREFIX))
      continue
    // Globals env vars (NUXT_PUBLIC_SCRIPTS_GLOBALS_*) target user-defined keys in
    // `scripts.globals`. Validate against the configured globals keys with typo
    // suggestions; fields can't be checked (globals are schemaless).
    if (envKey.startsWith(GLOBALS_ENV_PREFIX)) {
      if (!validGlobalsByScreaming.size)
        continue
      const segment = envKey.slice(GLOBALS_ENV_PREFIX.length)
      const segmentParts = segment.split('_')
      let matched = false
      for (const [screaming] of validGlobalsByScreaming) {
        const keyParts = screaming.split('_')
        if (segmentParts.length > keyParts.length
          && keyParts.every((p, i) => segmentParts[i] === p)) {
          matched = true
          break
        }
      }
      if (matched)
        continue
      // No exact prefix match — suggest the closest configured globals key.
      let best: { screaming: string, camel: string, dist: number } | undefined
      for (const [screaming, camel] of validGlobalsByScreaming) {
        const head = segmentParts.slice(0, screaming.split('_').length).join('_')
        const d = levenshtein(head, screaming)
        if (!best || d < best.dist)
          best = { screaming, camel, dist: d }
      }
      const suggestion = best && best.dist <= Math.max(2, Math.floor(best.screaming.length / 2))
        ? ` Did you mean globals key \`${best.camel}\` (\`${GLOBALS_ENV_PREFIX}${best.screaming}_*\`)?`
        : ` Configured globals: ${[...validGlobalsByScreaming.values()].map(k => `\`${k}\``).join(', ')}.`
      logger.warn(
        `[scripts] env var \`${envKey}\` does not map to any configured \`scripts.globals\` key.${suggestion}`,
      )
      continue
    }
    if (allValidEnvKeys.includes(envKey))
      continue

    const segment = envKey.slice(ENV_PREFIX.length)

    // Case 1: matches a valid registry key but unknown field
    let matchedKey: { screaming: string, camel: string, fields: Set<string> } | undefined
    for (const [screaming, info] of validByKey) {
      if (segment === screaming || segment.startsWith(`${screaming}_`)) {
        matchedKey = { screaming, ...info }
        break
      }
    }

    if (matchedKey) {
      const field = segment.slice(matchedKey.screaming.length + 1)
      logger.warn(
        `[scripts] env var \`${envKey}\` does not match any option on \`${matchedKey.camel}\`. `
        + `Valid fields: ${[...matchedKey.fields].map(f => `\`${ENV_PREFIX}${matchedKey!.screaming}_${f}\``).join(', ')}.${
          field ? ` Got: \`${field}\`.` : ''}`,
      )
      continue
    }

    // Case 2: registry key appears as a substring of the segment (e.g.
    // `MICROSOFT_CLARITY_ID` contains `CLARITY`). Likely a marketing-name
    // prefix; suggest the canonical key, and if the remainder is a valid
    // field, suggest the full corrected env var.
    const segmentParts = segment.split('_')
    let substringMatch: { screaming: string, camel: string, fields: Set<string>, remainder: string } | undefined
    for (const [screaming, info] of validByKey) {
      const keyParts = screaming.split('_')
      for (let i = 0; i <= segmentParts.length - keyParts.length; i++) {
        let ok = true
        for (let j = 0; j < keyParts.length; j++) {
          if (segmentParts[i + j] !== keyParts[j]) {
            ok = false
            break
          }
        }
        if (ok) {
          substringMatch = {
            screaming,
            camel: info.camel,
            fields: info.fields,
            remainder: segmentParts.slice(i + keyParts.length).join('_'),
          }
          break
        }
      }
      if (substringMatch)
        break
    }

    let suggestion = ''
    if (substringMatch) {
      if (substringMatch.remainder && substringMatch.fields.has(substringMatch.remainder)) {
        suggestion = ` Did you mean \`${ENV_PREFIX}${substringMatch.screaming}_${substringMatch.remainder}\` (registry key \`${substringMatch.camel}\`)?`
      }
      else {
        suggestion = ` Did you mean registry key \`${substringMatch.camel}\` (\`${ENV_PREFIX}${substringMatch.screaming}_*\`)?`
      }
    }
    else {
      // Fallback: closest registry key by edit distance on the leading parts
      let best: { key: string, camel: string, dist: number } | undefined
      for (const [screaming, info] of validByKey) {
        const head = segmentParts.slice(0, screaming.split('_').length).join('_')
        const d = levenshtein(head, screaming)
        if (!best || d < best.dist)
          best = { key: screaming, camel: info.camel, dist: d }
      }
      if (best && best.dist <= Math.max(2, Math.floor(best.key.length / 2)))
        suggestion = ` Did you mean registry key \`${best.camel}\` (\`${ENV_PREFIX}${best.key}_*\`)?`
    }

    logger.warn(
      `[scripts] env var \`${envKey}\` does not map to any registered script.${
        suggestion}`,
    )
  }

  // Case 3: env var maps to a known script that the user hasn't enabled in
  // their nuxt.config registry. The value gets resolved into runtimeConfig
  // but won't be consumed unless the script is registered.
  for (const [screaming, info] of validByKey) {
    if (enabledRegistryKeys.has(info.camel))
      continue
    for (const field of info.fields) {
      const envKey = `${ENV_PREFIX}${screaming}_${field}`
      if (process.env[envKey] !== undefined) {
        logger.warn(
          `[scripts] env var \`${envKey}\` is set but \`${info.camel}\` is not registered in \`scripts.registry\`. `
          + `Add \`registry: { ${info.camel}: {} }\` to your nuxt.config for it to take effect.`,
        )
      }
    }
  }
}
