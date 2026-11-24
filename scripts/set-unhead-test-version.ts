import { readFileSync, writeFileSync } from 'node:fs'

const version = process.argv[2]
if (!version || !/^\d+\.\d+\.\d+$/.test(version))
  throw new Error('Pass an exact Unhead version to test.')

const workspace = new URL('../pnpm-workspace.yaml', import.meta.url)
const lines = readFileSync(workspace, 'utf8').split('\n')

// Catalog consumers and transitive dependencies must resolve to the same version.
for (const key of ['\'@unhead/bundler@>=3\'', '\'@unhead/vue@>=3\'', 'unhead@>=3', '\'@unhead/vue\'', 'unhead']) {
  const prefix = `  ${key}: `
  const index = lines.findIndex(line => line.startsWith(prefix))
  if (index < 0)
    throw new Error(`Missing workspace entry ${key}.`)
  lines[index] = prefix + version
}

writeFileSync(workspace, lines.join('\n'))
