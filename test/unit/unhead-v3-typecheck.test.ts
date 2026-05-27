import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const exec = promisify(execFile)

const fixtureDir = fileURLToPath(new URL('../fixtures/unhead-v3', import.meta.url))

// Skip when the workspace root already resolves @unhead/vue to v3: the rest
// of the suite then provides v3 typecheck coverage and this fixture is
// redundant. See the matching guard in test/e2e/unhead-v3-compat.test.ts.
function rootUnheadMajor(): number | null {
  try {
    const pkgPath = fileURLToPath(new URL('../../node_modules/@unhead/vue/package.json', import.meta.url))
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    return Number.parseInt(String(pkg.version).split('.')[0], 10)
  }
  catch {
    return null
  }
}
const skip = rootUnheadMajor() === 3

// Pre-existing baseline errors that already exist when the fixture compiles
// against @unhead/vue@^3. These are unrelated to v3 type narrowing (the
// `$fetch<T>` generic on ScriptGoogleMaps.vue is a global-type resolution
// issue inside the auto-imported component). Captured here so the test only
// flags *new* errors against v3, not historical noise.
const KNOWN_BASELINE_ERRORS = new Set([
  'packages/script/src/runtime/components/GoogleMaps/ScriptGoogleMaps.vue(330,31): error TS2558: Expected 0 type arguments, but got 1.',
])

function parseTypecheckErrors(output: string): string[] {
  // Lines look like:
  //   ../../../packages/script/src/runtime/foo.ts(12,3): error TS1234: ...
  // Normalize the leading `../` segments away so the assertion is path-agnostic.
  const lines = output.split('\n')
  return lines
    .filter(l => /error TS\d+/.test(l))
    .map(l => l.replace(/^(\.\.\/)+/, ''))
    .sort()
}

describe.skipIf(skip)('unhead v3 typecheck regression', () => {
  it('introduces no new type errors when compiled against @unhead/vue@^3', async () => {
    let stdout = ''
    let stderr = ''
    try {
      const res = await exec('pnpm', ['exec', 'nuxt', 'typecheck'], {
        cwd: fixtureDir,
        env: { ...process.env, FORCE_COLOR: '0' },
        maxBuffer: 32 * 1024 * 1024,
      })
      stdout = res.stdout
      stderr = res.stderr
    }
    catch (err: any) {
      stdout = err.stdout || ''
      stderr = err.stderr || ''
    }

    const errors = parseTypecheckErrors(`${stdout}\n${stderr}`)
    const newErrors = errors.filter(e => !KNOWN_BASELINE_ERRORS.has(e))

    expect(newErrors, [
      'New type errors detected when typechecking the unhead-v3 fixture.',
      'Either: (a) fix the source so it compiles against @unhead/vue@^3, or',
      '(b) add the error to KNOWN_BASELINE_ERRORS with a comment explaining why.',
    ].join('\n')).toEqual([])
  }, 120_000)
})
