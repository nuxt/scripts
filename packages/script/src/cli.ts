/**
 * @nuxt/scripts CLI.
 *
 * Keep this entrypoint dependency-free so it can host migration commands and
 * codemods without making normal module startup heavier.
 */

export interface CliIo {
  writeStdout: (value: string) => void
  writeStderr: (value: string) => void
}

export type CliResult
  = | { _tag: 'Success', output: string }
    | { _tag: 'Failure', output: string }

const help = [
  '',
  '  @nuxt/scripts CLI',
  '',
  '  Usage: npx @nuxt/scripts <command>',
  '',
  '  Commands:',
  '    help   Show this help',
  '',
  '',
].join('\n')

export function resolveCliCommand(args: string[]): CliResult {
  const command = args[0]

  if (!command || command === 'help' || command === '--help' || command === '-h')
    return { _tag: 'Success', output: help }

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

  io.writeStderr(result.output)
  return 1
}
