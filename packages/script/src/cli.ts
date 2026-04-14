/**
 * @nuxt/scripts CLI.
 *
 * Currently hosts a single command, `generate-secret`, which produces a
 * cryptographically random HMAC secret for `NUXT_SCRIPTS_PROXY_SECRET`. This
 * is an alternative to letting the module auto-write a secret into `.env`,
 * for users who want explicit control (e.g. teams that commit secrets to a
 * vault rather than `.env`).
 *
 * Keep this file zero-dependency: it runs standalone via `npx @nuxt/scripts`
 * and should boot instantly.
 */

import { randomBytes } from 'node:crypto'
import process from 'node:process'

function generateSecret(): void {
  const secret = randomBytes(32).toString('hex')
  process.stdout.write(
    [
      '',
      '  @nuxt/scripts: proxy signing secret',
      '',
      `  Secret: ${secret}`,
      '',
      '  Add this to your environment:',
      `    NUXT_SCRIPTS_PROXY_SECRET=${secret}`,
      '',
      '  The secret is automatically picked up by the module via runtime config.',
      '  It must be the same across all deployments and prerender builds so that',
      '  signed URLs remain valid.',
      '',
      '',
    ].join('\n'),
  )
}

function showHelp(): void {
  process.stdout.write(
    [
      '',
      '  @nuxt/scripts CLI',
      '',
      '  Usage: npx @nuxt/scripts <command>',
      '',
      '  Commands:',
      '    generate-secret   Generate a signing secret for proxy URL tamper protection',
      '    help              Show this help',
      '',
      '',
    ].join('\n'),
  )
}

const command = process.argv[2]

if (!command || command === 'help' || command === '--help' || command === '-h') {
  showHelp()
}
else if (command === 'generate-secret') {
  generateSecret()
}
else {
  process.stderr.write(`Unknown command: ${command}\n`)
  showHelp()
  process.exit(1)
}
