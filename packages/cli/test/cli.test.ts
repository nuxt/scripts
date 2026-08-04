import type { CliDependencies } from '../src/cli'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveCliCommand, runCli } from '../src/cli'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true })
})

function createTemporaryProject(): string {
  const directory = mkdtempSync(join(tmpdir(), 'nuxt-scripts-cli-'))
  temporaryDirectories.push(directory)
  return directory
}

function runCommand(args: string[], dependencies?: Partial<CliDependencies>): { exitCode: 0 | 1, stdout: string, stderr: string } {
  const stdout: string[] = []
  const stderr: string[] = []
  const exitCode = runCli(args, {
    writeStdout: value => stdout.push(value),
    writeStderr: value => stderr.push(value),
  }, dependencies)
  return { exitCode, stdout: stdout.join(''), stderr: stderr.join('') }
}

describe('@nuxt/scripts-cli', () => {
  it.each([
    { args: [] },
    { args: ['help'] },
    { args: ['--help'] },
    { args: ['-h'] },
  ])('shows help for $args', ({ args }) => {
    expect(resolveCliCommand(args)).toEqual({
      _tag: 'Success',
      output: expect.stringContaining('Usage: npx @nuxt/scripts-cli <command>'),
    })
  })

  it('does not advertise the removed generate-secret command', () => {
    const result = resolveCliCommand([])

    expect(result.output).not.toContain('generate-secret')
  })

  it('advertises the v2 migration command', () => {
    const result = resolveCliCommand([])

    expect(result.output).toContain('migrate v2')
    expect(result.output).toContain('--dry-run')
  })

  it('migrates static v1 registry configuration to the flat v2 shape', () => {
    const directory = createTemporaryProject()
    const configPath = join(directory, 'nuxt.config.ts')
    writeFileSync(configPath, `export default defineNuxtConfig({
  scripts: {
    googleStaticMapsProxy: { enabled: true },
    registry: {
      googleAnalytics: true,
      instagramEmbed: true,
      plausibleAnalytics: [{ scriptId: 'site' }, { proxy: false }],
      calendly: { scriptOptions: { bundle: false }, trigger: 'onNuxtReady' },
      posthog: { proxy: true, reverseProxyIntercept: false },
      matomoAnalytics: { matomoUrl: 'https://example.com', trackPageView: false },
      infrastructure: 'proxy-only',
      mocked: 'mock',
    },
  },
})\n`)

    const result = runCommand(['migrate', 'v2', '--cwd', directory])
    const migrated = readFileSync(configPath, 'utf8')

    expect(result).toMatchObject({ exitCode: 0, stderr: '' })
    expect(result.stdout).toContain('Migrated 1 file')
    expect(migrated).toContain('googleAnalytics: {\n        trigger: \'onNuxtReady\'')
    expect(migrated).toContain('instagramEmbed: {}')
    expect(migrated).toContain('scriptId: \'site\'')
    expect(migrated).toContain('proxy: false')
    expect(migrated).toContain('bundle: false')
    expect(migrated).toContain('trigger: \'onNuxtReady\'')
    expect(migrated).toContain('posthog: {\n        proxy: true')
    expect(migrated).toContain('watch: false')
    expect(migrated).toContain('infrastructure: {}')
    expect(migrated).toContain('mocked: \'mock\'')
    expect(migrated).not.toContain('scriptOptions')
    expect(migrated).not.toContain('reverseProxyIntercept')
    expect(migrated).not.toContain('trackPageView')
    expect(migrated).not.toContain('googleStaticMapsProxy')
  })

  it('reports dynamic config and leaves it for manual migration', () => {
    const directory = createTemporaryProject()
    const configPath = join(directory, 'nuxt.config.ts')
    const source = `export default defineNuxtConfig({
  scripts: {
    globals: ['https://example.com/a.js'],
    registry: {
      googleAnalytics: [analyticsInput, analyticsOptions],
      calendly: { scriptOptions: sharedOptions },
    },
  },
})\n`
    writeFileSync(configPath, source)

    const result = runCommand(['migrate', 'v2', '--cwd', directory])
    const migrated = readFileSync(configPath, 'utf8')

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Manual follow-up')
    expect(result.stdout).toContain('globals')
    expect(result.stdout).toContain('googleAnalytics')
    expect(result.stdout).toContain('calendly')
    expect(migrated).toBe(source)
  })

  it('continues safe entry migrations when scriptOptions is dynamic', () => {
    const directory = createTemporaryProject()
    const configPath = join(directory, 'nuxt.config.ts')
    writeFileSync(configPath, `export default defineNuxtConfig({
  scripts: {
    registry: {
      matomoAnalytics: {
        scriptOptions: sharedOptions,
        reverseProxyIntercept: false,
        trackPageView: false,
      },
    },
  },
})\n`)

    const result = runCommand(['migrate', 'v2', '--cwd', directory])
    const migrated = readFileSync(configPath, 'utf8')

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('scriptOptions is dynamic')
    expect(migrated).toContain('scriptOptions: sharedOptions')
    expect(migrated).toContain('proxy: false')
    expect(migrated).toContain('watch: false')
    expect(migrated).not.toContain('reverseProxyIntercept')
    expect(migrated).not.toContain('trackPageView')
  })

  it('supports a dry run without writing files', () => {
    const directory = createTemporaryProject()
    const configPath = join(directory, 'nuxt.config.ts')
    const source = `export default defineNuxtConfig({ scripts: { registry: { googleAnalytics: true } } })\n`
    writeFileSync(configPath, source)

    const result = runCommand(['migrate', 'v2', '--dry-run', '--cwd', directory])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Dry run')
    expect(result.stdout).toContain('Would migrate 1 file')
    expect(readFileSync(configPath, 'utf8')).toBe(source)
  })

  it('migrates mechanical component and proxy API aliases', () => {
    const directory = createTemporaryProject()
    const pagePath = join(directory, 'page.vue')
    writeFileSync(pagePath, `<script setup lang="ts">
proxy.rybbit.pageview('/pricing')
proxy.ttq('track', 'ViewContent', { value: 10 })
proxy.ttq('page')
</script>
<template>
  <ScriptGoogleMapsAdvancedMarkerElement />
</template>
`)

    const result = runCommand(['migrate', 'v2', '--cwd', directory])
    const migrated = readFileSync(pagePath, 'utf8')

    expect(result.exitCode).toBe(0)
    expect(migrated).toContain('proxy.pageview(\'/pricing\')')
    expect(migrated).toContain('proxy.ttq.track(\'ViewContent\', { value: 10 })')
    expect(migrated).toContain('proxy.ttq.page()')
    expect(migrated).toContain('<ScriptGoogleMapsMarker />')
    expect(migrated).not.toContain('AdvancedMarkerElement')
  })

  it('rejects unsupported migration versions', () => {
    const result = runCommand(['migrate', 'v1'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Usage: npx @nuxt/scripts-cli migrate v2')
  })

  it('rejects a cwd that is not a directory', () => {
    const directory = createTemporaryProject()
    const configPath = join(directory, 'nuxt.config.ts')
    writeFileSync(configPath, 'export default defineNuxtConfig({})\n')

    const result = runCommand(['migrate', 'v2', '--cwd', configPath])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Project path is not a directory')
  })

  it('reports filesystem failures and continues migrating other files', () => {
    const directory = createTemporaryProject()
    const blockedDirectory = join(directory, 'blocked')
    const unreadablePath = join(directory, 'unreadable.vue')
    const unwritablePath = join(directory, 'unwritable.vue')
    const migratedPath = join(directory, 'migrated.vue')
    mkdirSync(blockedDirectory)
    writeFileSync(join(blockedDirectory, 'ignored.vue'), 'proxy.rybbit.pageview()\n')
    writeFileSync(unreadablePath, 'proxy.rybbit.pageview()\n')
    writeFileSync(unwritablePath, 'proxy.rybbit.pageview()\n')
    writeFileSync(migratedPath, 'proxy.rybbit.pageview()\n')

    const result = runCommand(['migrate', 'v2', '--cwd', directory], {
      readDirectory(path) {
        if (path === blockedDirectory)
          throw new Error('directory denied')
        return readdirSync(path, { withFileTypes: true })
      },
      readFile(path) {
        if (path === unreadablePath)
          throw new Error('read denied')
        return readFileSync(path, 'utf8')
      },
      stat: statSync,
      writeFile(path, source) {
        if (path === unwritablePath)
          throw new Error('write denied')
        writeFileSync(path, source)
      },
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('blocked: could not read directory: directory denied')
    expect(result.stdout).toContain('unreadable.vue: could not read file: read denied')
    expect(result.stdout).toContain('unwritable.vue: could not write file: write denied')
    expect(readFileSync(migratedPath, 'utf8')).toBe('proxy.pageview()\n')
    expect(readFileSync(unwritablePath, 'utf8')).toBe('proxy.rybbit.pageview()\n')
  })

  it('reports unknown commands through stderr', () => {
    const stdout: string[] = []
    const stderr: string[] = []

    const exitCode = runCli(['migrate'], {
      writeStdout: value => stdout.push(value),
      writeStderr: value => stderr.push(value),
    })

    expect(exitCode).toBe(1)
    expect(stdout).toEqual([])
    expect(stderr.join('')).toContain('Unknown command: migrate')
  })
})
