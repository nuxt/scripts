import { describe, expect, it } from 'vitest'
import { planRelease } from '../../scripts/release-plan'

const versions = ['2.0.0-beta.16', '2.0.0-beta.16', '2.0.0-beta.16', '2.0.0-beta.16']

describe('release planning', () => {
  it('releases an aligned version change after main CI', () => {
    expect(planRelease(versions, { _tag: 'Merge', previousVersion: '2.0.0-beta.15' })).toEqual({
      _tag: 'Release',
      tag: 'v2.0.0-beta.16',
      distTag: 'beta',
    })
  })

  it('skips a merge without a version change', () => {
    expect(planRelease(versions, { _tag: 'Merge', previousVersion: versions[0] })).toEqual({ _tag: 'Skip' })
  })

  it('rejects mismatched workspace versions', () => {
    expect(planRelease([...versions.slice(0, 3), '2.0.0-beta.15'], { _tag: 'Merge', previousVersion: '2.0.0-beta.15' })).toEqual({
      _tag: 'Err',
      message: 'All package versions must match before release.',
    })
  })

  it('rejects a tag that differs from the package version', () => {
    expect(planRelease(versions, { _tag: 'Tag', tag: 'v2.0.0-beta.15' })).toEqual({
      _tag: 'Err',
      message: 'The release tag must match the package version.',
    })
  })

  it.each(['bad', '2.0.0-beta.1\n', '2.0.0-other.1', null])('rejects unsafe version %s', (version) => {
    expect(planRelease([version, version, version, version], { _tag: 'Tag', tag: 'vbad' })).toEqual({
      _tag: 'Err',
      message: 'Use a stable, alpha, beta, or rc package version.',
    })
  })

  it.each([
    ['2.1.0', 'latest'],
    ['2.1.0-alpha.1', 'alpha'],
    ['2.1.0-rc.1', 'rc'],
  ])('publishes %s to %s', (version, distTag) => {
    expect(planRelease([version, version, version, version], { _tag: 'Tag', tag: `v${version}` })).toEqual({
      _tag: 'Release',
      tag: `v${version}`,
      distTag,
    })
  })
})
