import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { generateCode, parseModule } from 'magicast/core'
import { relative, resolve } from 'pathe'

export interface CliIo {
  writeStdout: (value: string) => void
  writeStderr: (value: string) => void
}

export type CliResult
  = | { _tag: 'Success', output: string }
    | { _tag: 'Failure', output: string }
    | { _tag: 'MigrateV2', output: '', cwd: string, dryRun: boolean }

interface MigrationIssue {
  file: string
  message: string
}

interface MigratedFile {
  file: string
  changes: number
}

interface SourceMigration {
  source: string
  changes: number
  issues: string[]
}

type StaticObject = Record<string, unknown> & { $type: 'object' }
type StaticArray = unknown[] & { $type: 'array' }

const componentOnlyRegistryKeys = new Set([
  'blueskyEmbed',
  'carbonAds',
  'instagramEmbed',
  'xEmbed',
])

const ignoredDirectories = new Set([
  '.data',
  '.git',
  '.nuxt',
  '.output',
  'dist',
  'node_modules',
])

const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.vue'])
const configPattern = /^nuxt\.config\.(?:js|mjs|cjs|ts)$/

const help = [
  '',
  '  @nuxt/scripts-cli',
  '',
  '  Usage: npx @nuxt/scripts-cli <command>',
  '',
  '  Commands:',
  '    migrate v2        Migrate a Nuxt Scripts v1 project to v2',
  '    help              Show this help',
  '',
  '  Migration options:',
  '    --dry-run         Report changes without writing files',
  '    --cwd <directory> Project directory, defaults to the current directory',
  '',
].join('\n')

const migrateUsage = 'Usage: npx @nuxt/scripts-cli migrate v2 [--dry-run] [--cwd <directory>]\n'

function proxyType(value: unknown): unknown {
  if (typeof value !== 'object' || value === null)
    return undefined
  return Reflect.get(value, '$type')
}

function isStaticObject(value: unknown): value is StaticObject {
  return proxyType(value) === 'object'
}

function isStaticArray(value: unknown): value is StaticArray {
  return proxyType(value) === 'array'
}

function copyProperties(target: StaticObject, source: StaticObject, overwrite: boolean): number {
  let changes = 0
  for (const [key, value] of Object.entries(source)) {
    if (!overwrite && key in target)
      continue
    target[key] = value
    changes++
  }
  return changes
}

function migrateFlatRegistryEntry(key: string, entry: StaticObject): { changes: number, issues: string[] } {
  let changes = 0
  const issues: string[] = []

  if ('scriptOptions' in entry) {
    const scriptOptions = entry.scriptOptions
    if (!isStaticObject(scriptOptions)) {
      return {
        changes: 0,
        issues: [`registry.${key}.scriptOptions is dynamic and must be flattened manually`],
      }
    }
    delete entry.scriptOptions
    changes++
    changes += copyProperties(entry, scriptOptions, false)
  }

  if ('reverseProxyIntercept' in entry) {
    if (!('proxy' in entry))
      entry.proxy = entry.reverseProxyIntercept
    delete entry.reverseProxyIntercept
    changes++
  }

  if (key === 'matomoAnalytics' && 'trackPageView' in entry) {
    if (!('watch' in entry))
      entry.watch = entry.trackPageView
    delete entry.trackPageView
    changes++
  }

  if (key === 'plausibleAnalytics' && ('domain' in entry || 'extension' in entry))
    issues.push('registry.plausibleAnalytics needs a scriptId and current init options')

  return { changes, issues }
}

function migrateRegistry(registry: StaticObject): { changes: number, issues: string[] } {
  let changes = 0
  const issues: string[] = []

  for (const [key, value] of Object.entries(registry)) {
    if (value === true) {
      registry[key] = componentOnlyRegistryKeys.has(key) ? {} : { trigger: 'onNuxtReady' }
      changes++
      continue
    }

    if (value === 'proxy-only') {
      registry[key] = {}
      changes++
      continue
    }

    if (value === false || value === 'mock')
      continue

    let entry = value
    if (isStaticArray(value)) {
      const [input, options] = value
      if (!isStaticObject(input) || (options !== undefined && !isStaticObject(options))) {
        issues.push(`registry.${key} uses a dynamic tuple and must be flattened manually`)
        continue
      }
      entry = input
      if (isStaticObject(options))
        copyProperties(input, options, true)
      registry[key] = input
      changes++
    }

    if (!isStaticObject(entry)) {
      issues.push(`registry.${key} is dynamic and must be migrated manually`)
      continue
    }

    const migrated = migrateFlatRegistryEntry(key, entry)
    changes += migrated.changes
    issues.push(...migrated.issues)
  }

  return { changes, issues }
}

function migrateNuxtConfig(source: string): SourceMigration {
  let module: ReturnType<typeof parseModule>
  try {
    module = parseModule(source)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { source, changes: 0, issues: [`could not parse Nuxt config: ${message}`] }
  }

  try {
    const defaultExport = (module.exports as unknown as StaticObject & { default: unknown }).default
    const config = proxyType(defaultExport) === 'function-call'
      ? Reflect.get(defaultExport as object, '$args')[0]
      : defaultExport

    if (!isStaticObject(config))
      return { source, changes: 0, issues: ['default Nuxt config export is dynamic'] }

    const scripts = config.scripts
    if (scripts === undefined)
      return { source, changes: 0, issues: [] }
    if (!isStaticObject(scripts))
      return { source, changes: 0, issues: ['scripts config is dynamic'] }

    let changes = 0
    const issues: string[] = []

    if ('googleStaticMapsProxy' in scripts) {
      delete scripts.googleStaticMapsProxy
      changes++
    }

    if ('globals' in scripts)
      issues.push('scripts.globals must be replaced with a keyed object manually')

    if (scripts.registry !== undefined) {
      if (!isStaticObject(scripts.registry)) {
        issues.push('scripts.registry is dynamic')
      }
      else {
        const migrated = migrateRegistry(scripts.registry)
        changes += migrated.changes
        issues.push(...migrated.issues)
      }
    }

    return {
      source: changes > 0 ? generateCode(module).code : source,
      changes,
      issues,
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { source, changes: 0, issues: [`could not inspect Nuxt config: ${message}`] }
  }
}

function replaceAll(source: string, search: string | RegExp, replacement: string): { source: string, changes: number } {
  let changes = 0
  const migrated = source.replace(search, (...args: unknown[]) => {
    changes++
    return typeof replacement === 'string' ? replacement : String(args[0])
  })
  return { source: migrated, changes }
}

function migrateSource(source: string): SourceMigration {
  const replacements: Array<[string | RegExp, string]> = [
    [/\bScriptGoogleMapsAdvancedMarkerElement\b/g, 'ScriptGoogleMapsMarker'],
    [/\bproxy\.rybbit\.pageview\b/g, 'proxy.pageview'],
    [/\bproxy\.ttq\(\s*(['"])page\1\s*\)/g, 'proxy.ttq.page()'],
    [/\bproxy\.ttq\(\s*(['"])track\1\s*,\s*/g, 'proxy.ttq.track('],
  ]

  let migrated = source
  let changes = 0
  for (const [search, replacement] of replacements) {
    const result = replaceAll(migrated, search, replacement)
    migrated = result.source
    changes += result.changes
  }

  const issues: string[] = []
  if (/\bScriptGoogleMaps(?:PinElement|HeatmapLayer)\b/.test(migrated))
    issues.push('removed Google Maps components need a manual replacement')

  return { source: migrated, changes, issues }
}

function extension(file: string): string {
  const match = file.match(/(\.[^.]+)$/)
  return match?.[1] ?? ''
}

function collectSourceFiles(directory: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name))
        files.push(...collectSourceFiles(resolve(directory, entry.name)))
      continue
    }
    if (entry.isFile() && sourceExtensions.has(extension(entry.name)))
      files.push(resolve(directory, entry.name))
  }
  return files
}

function runV2Migration(cwd: string, dryRun: boolean): string {
  const files = collectSourceFiles(cwd)
  const migratedFiles: MigratedFile[] = []
  const issues: MigrationIssue[] = []

  for (const file of files) {
    const original = readFileSync(file, 'utf8')
    const configMigration = configPattern.test(file.split('/').at(-1) ?? '')
      ? migrateNuxtConfig(original)
      : { source: original, changes: 0, issues: [] }
    const sourceMigration = migrateSource(configMigration.source)
    const changes = configMigration.changes + sourceMigration.changes

    for (const message of [...configMigration.issues, ...sourceMigration.issues])
      issues.push({ file, message })

    if (changes === 0)
      continue
    if (!dryRun)
      writeFileSync(file, sourceMigration.source)
    migratedFiles.push({ file, changes })
  }

  const lines = ['Nuxt Scripts v2 migration']
  if (dryRun)
    lines.push('Dry run, no files were written.')

  if (migratedFiles.length === 0) {
    lines.push('No automatic migrations found.')
  }
  else {
    const changeCount = migratedFiles.reduce((total, file) => total + file.changes, 0)
    const verb = dryRun ? 'Would migrate' : 'Migrated'
    lines.push(`${verb} ${migratedFiles.length} file${migratedFiles.length === 1 ? '' : 's'}, ${changeCount} change${changeCount === 1 ? '' : 's'}.`)
    for (const file of migratedFiles)
      lines.push(`  ${relative(cwd, file.file)} (${file.changes})`)
  }

  if (issues.length > 0) {
    lines.push('Manual follow-up:')
    for (const issue of issues)
      lines.push(`  ${relative(cwd, issue.file)}: ${issue.message}`)
  }

  return `${lines.join('\n')}\n`
}

function resolveMigration(args: string[]): CliResult {
  if (args[0] !== 'v2')
    return { _tag: 'Failure', output: migrateUsage }

  let cwd = process.cwd()
  let dryRun = false
  for (let index = 1; index < args.length; index++) {
    const argument = args[index]
    if (argument === '--dry-run') {
      dryRun = true
      continue
    }
    if (argument === '--cwd') {
      const directory = args[++index]
      if (!directory)
        return { _tag: 'Failure', output: `${migrateUsage}Missing value for --cwd.\n` }
      cwd = resolve(directory)
      continue
    }
    return { _tag: 'Failure', output: `${migrateUsage}Unknown option: ${argument}\n` }
  }

  if (!existsSync(cwd))
    return { _tag: 'Failure', output: `Project directory does not exist: ${cwd}\n` }

  return { _tag: 'MigrateV2', output: '', cwd, dryRun }
}

export function resolveCliCommand(args: string[]): CliResult {
  const command = args[0]

  if (!command || command === 'help' || command === '--help' || command === '-h')
    return { _tag: 'Success', output: help }
  if (command === 'migrate' && args.length > 1)
    return resolveMigration(args.slice(1))

  return {
    _tag: 'Failure',
    output: `Unknown command: ${command}\n${help}`,
  }
}

export function runCli(args: string[], io: CliIo): 0 | 1 {
  const result = resolveCliCommand(args)

  if (result._tag === 'Success') {
    io.writeStdout(result.output)
    return 0
  }
  if (result._tag === 'MigrateV2') {
    io.writeStdout(runV2Migration(result.cwd, result.dryRun))
    return 0
  }

  io.writeStderr(result.output)
  return 1
}
