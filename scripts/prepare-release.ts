import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import process from 'node:process'
import { planRelease } from './release-plan.ts'

function readVersion(source: string): unknown {
  const manifest: unknown = JSON.parse(source)
  if (!manifest || typeof manifest !== 'object' || !('version' in manifest))
    throw new Error('The package manifest must contain a version.')
  return manifest.version
}

const versions = [
  'package.json',
  'packages/script/package.json',
  'packages/cli/package.json',
  'packages/devtools-app/package.json',
].map(path => readVersion(readFileSync(path, 'utf8')))

const mode = process.env.GITHUB_EVENT_NAME
if (mode !== 'push' && mode !== 'workflow_run')
  throw new Error('Release requires a tag push or completed main CI.')

const plan = planRelease(versions, mode === 'push'
  ? { _tag: 'Tag', tag: process.env.GITHUB_REF_NAME || '' }
  : { _tag: 'Merge', previousVersion: readVersion(execFileSync('git', ['show', 'HEAD^:package.json'], { encoding: 'utf8' })) })

if (plan._tag === 'Err')
  throw new Error(plan.message)

const output = process.env.GITHUB_OUTPUT
if (!output)
  throw new Error('GitHub Actions must provide the output file.')

appendFileSync(output, plan._tag === 'Skip'
  ? 'release=false\n'
  : `release=true\ntag=${plan.tag}\ndist-tag=${plan.distTag}\n`)
