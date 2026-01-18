#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'
import { consola } from 'consola'
import { colors } from 'consola/utils'
import { resolve, join } from 'pathe'
import { existsSync } from 'node:fs'
import fsp from 'node:fs/promises'

const main = defineCommand({
  meta: {
    name: 'nuxt-scripts',
    description: 'Nuxt Scripts CLI',
  },
  subCommands: {
    status: defineCommand({
      meta: {
        name: 'status',
        description: 'Show first-party mode status and configuration',
      },
      async run() {
        consola.box('Nuxt Scripts Status')

        // Try to read from .nuxt directory for build info
        const nuxtDir = resolve(process.cwd(), '.nuxt')
        const cacheDir = join(nuxtDir, 'cache', 'scripts')

        if (!existsSync(nuxtDir)) {
          consola.warn('No .nuxt directory found. Run `nuxi dev` or `nuxi build` first.')
          return
        }

        // Check for cached scripts
        if (existsSync(cacheDir)) {
          const files = await fsp.readdir(cacheDir)
          const scriptFiles = files.filter(f => f.endsWith('.js'))
          const metaFiles = files.filter(f => f.startsWith('bundle-meta:'))

          consola.info(`Cached scripts: ${colors.cyan(scriptFiles.length.toString())}`)

          if (scriptFiles.length > 0) {
            for (const file of scriptFiles.slice(0, 10)) {
              const stats = await fsp.stat(join(cacheDir, file))
              const sizeKb = (stats.size / 1024).toFixed(1)
              consola.log(`  ${colors.dim('•')} ${file} ${colors.dim(`(${sizeKb} KB)`)}`)
            }
            if (scriptFiles.length > 10) {
              consola.log(`  ${colors.dim(`... and ${scriptFiles.length - 10} more`)}`)
            }
          }

          // Show cache metadata
          if (metaFiles.length > 0) {
            consola.info(`Cache entries: ${colors.cyan(metaFiles.length.toString())}`)
          }
        }
        else {
          consola.info('No cached scripts found')
        }

        consola.log('')
        consola.info(`View detailed status in browser: ${colors.cyan('/_scripts/status.json')} (dev mode)`)
        consola.info(`Or open Nuxt DevTools → Scripts → First-Party tab`)
      },
    }),

    clear: defineCommand({
      meta: {
        name: 'clear',
        description: 'Clear bundled script cache',
      },
      args: {
        force: {
          type: 'boolean',
          alias: 'f',
          description: 'Skip confirmation',
        },
      },
      async run({ args }) {
        const cacheDir = resolve(process.cwd(), '.nuxt', 'cache', 'scripts')

        if (!existsSync(cacheDir)) {
          consola.info('No script cache to clear')
          return
        }

        const files = await fsp.readdir(cacheDir)
        if (files.length === 0) {
          consola.info('Cache is already empty')
          return
        }

        if (!args.force) {
          const confirmed = await consola.prompt(
            `Clear ${files.length} cached file(s)?`,
            { type: 'confirm' },
          )
          if (!confirmed) {
            consola.info('Cancelled')
            return
          }
        }

        await fsp.rm(cacheDir, { recursive: true })
        consola.success(`Cleared ${files.length} cached file(s)`)
        consola.info('Scripts will be re-downloaded on next build')
      },
    }),

    health: defineCommand({
      meta: {
        name: 'health',
        description: 'Check first-party proxy health (requires dev server running)',
      },
      args: {
        port: {
          type: 'string',
          alias: 'p',
          description: 'Dev server port',
          default: '3000',
        },
      },
      async run({ args }) {
        const port = args.port || '3000'
        const url = `http://localhost:${port}/_scripts/health.json`

        consola.info(`Checking health at ${url}...`)

        const res = await fetch(url)
          .then(r => r.json())
          .catch((err) => {
            consola.error(`Failed to connect: ${err.message}`)
            consola.info('Make sure the dev server is running with `nuxi dev`')
            return null
          })

        if (!res)
          return

        if (res.status === 'disabled') {
          consola.warn('First-party mode is not enabled')
          return
        }

        consola.box(`Health Check: ${res.status === 'healthy' ? colors.green('HEALTHY') : colors.yellow('DEGRADED')}`)

        consola.info(`Total routes: ${res.summary.total}`)
        consola.info(`Successful: ${colors.green(res.summary.ok.toString())}`)
        if (res.summary.errors > 0) {
          consola.info(`Errors: ${colors.red(res.summary.errors.toString())}`)
        }
        consola.info(`Avg latency: ${res.summary.avgLatency}ms`)

        consola.log('')
        for (const check of res.checks) {
          const icon = check.status === 'ok' ? colors.green('✓') : colors.red('✗')
          const latency = check.latency ? colors.dim(` (${check.latency}ms)`) : ''
          const error = check.error ? colors.red(` - ${check.error}`) : ''
          consola.log(`${icon} ${check.script}${latency}${error}`)
        }
      },
    }),
  },
})

runMain(main)
