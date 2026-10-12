import { appendFileSync, readFileSync } from 'node:fs'
import process from 'node:process'
import { planPromotion } from './release-plan.ts'

const distTag = process.env.RELEASE_DIST_TAG
const output = process.env.GITHUB_OUTPUT
if (!distTag || !output)
  throw new Error('Release requires a distribution tag and an Actions output file.')

const names = ['@nuxt/scripts', '@nuxt/scripts-cli', '@nuxt/scripts-devtools']
const currentVersions = await Promise.all(names.map(async (name) => {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, {
    headers: { 'accept': 'application/vnd.npm.install-v1+json', 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok)
    throw new Error(`Registry lookup failed for ${name}: ${response.status}.`)
  const metadata: unknown = await response.json()
  if (!metadata || typeof metadata !== 'object' || !('dist-tags' in metadata))
    throw new Error(`Registry metadata lacks distribution tags for ${name}.`)
  const tags = metadata['dist-tags']
  if (!tags || typeof tags !== 'object')
    throw new Error(`Registry distribution tags are invalid for ${name}.`)
  return Object.hasOwn(tags, distTag) ? Reflect.get(tags, distTag) : undefined
}))

const manifest: unknown = JSON.parse(readFileSync('package.json', 'utf8'))
if (!manifest || typeof manifest !== 'object' || !('version' in manifest))
  throw new Error('The package manifest must contain a version.')
const plan = planPromotion(manifest.version, currentVersions.filter(version => version !== undefined))
if (plan._tag === 'Err')
  throw new Error(plan.message)
if (plan._tag === 'Skip')
  console.log('Skip publication because a newer version owns the distribution tag.')
appendFileSync(output, `promote=${plan._tag === 'Promote'}\n`)
