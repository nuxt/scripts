type ReleaseTrigger
  = { _tag: 'Merge', previousVersion: unknown }
    | { _tag: 'Tag', tag: string }

type ReleasePlan
  = { _tag: 'Skip' }
    | { _tag: 'Release', tag: string, distTag: string }
    | { _tag: 'Err', message: string }

export function planRelease(versions: readonly unknown[], trigger: ReleaseTrigger): ReleasePlan {
  const version = versions[0]
  const match = typeof version === 'string'
    ? /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(alpha|beta|rc)\.(?:0|[1-9]\d*))?$/.exec(version)
    : null
  if (!match || match[0] !== version)
    return { _tag: 'Err', message: 'Use a stable, alpha, beta, or rc package version.' }
  if (versions.length !== 4 || versions.some(value => value !== version))
    return { _tag: 'Err', message: 'All package versions must match before release.' }
  if (trigger._tag === 'Merge' && trigger.previousVersion === version)
    return { _tag: 'Skip' }
  const tag = `v${version}`
  if (trigger._tag === 'Tag' && trigger.tag !== tag)
    return { _tag: 'Err', message: 'The release tag must match the package version.' }
  return { _tag: 'Release', tag, distTag: match[1] || 'latest' }
}
