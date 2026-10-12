type ReleaseTrigger
  = { _tag: 'Merge', previousVersion: unknown }
    | { _tag: 'Tag', tag: string }

type ReleasePlan
  = { _tag: 'Skip' }
    | { _tag: 'Release', tag: string, distTag: string }
    | { _tag: 'Err', message: string }

function parseVersion(version: unknown): readonly bigint[] | null {
  if (typeof version !== 'string')
    return null
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(alpha|beta|rc)\.(0|[1-9]\d*))?$/.exec(version)
  if (!match || match[0] !== version)
    return null
  const channelRank = match[4] === 'alpha' ? 0n : match[4] === 'beta' ? 1n : match[4] === 'rc' ? 2n : 3n
  return [BigInt(match[1]!), BigInt(match[2]!), BigInt(match[3]!), channelRank, BigInt(match[5] || '0')]
}

export function planPromotion(candidate: unknown, currentVersions: readonly unknown[]):
  { _tag: 'Promote' } | { _tag: 'Skip' } | { _tag: 'Err', message: string } {
  const version = parseVersion(candidate)
  if (!version)
    return { _tag: 'Err', message: 'The release version must use a supported release version.' }
  for (const current of currentVersions) {
    const published = parseVersion(current)
    if (!published)
      return { _tag: 'Err', message: 'The channel version must use a supported release version.' }
    for (let index = 0; index < version.length; index++) {
      if (published[index]! > version[index]!)
        return { _tag: 'Skip' }
      if (published[index]! < version[index]!)
        break
    }
  }
  return { _tag: 'Promote' }
}

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
