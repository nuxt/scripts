/**
 * @nuxt/scripts CLI.
 *
 * Keep this file zero-dependency: it runs standalone via `npx @nuxt/scripts`
 * and should boot instantly.
 */

import process from 'node:process'

function showHelp(): void {
  process.stdout.write(
    [
      '',
      '  @nuxt/scripts CLI',
      '',
      '  Usage: npx @nuxt/scripts <command>',
      '',
      '  Commands:',
      '    help   Show this help',
      '',
      '',
    ].join('\n'),
  )
}

const command = process.argv[2]

if (!command || command === 'help' || command === '--help' || command === '-h') {
  showHelp()
}
else {
  process.stderr.write(`Unknown command: ${command}\n`)
  showHelp()
  process.exit(1)
}
