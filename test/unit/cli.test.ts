import { describe, expect, it } from 'vitest'
import { resolveCliCommand, runCli } from '../../packages/script/src/cli'

describe('@nuxt/scripts CLI', () => {
  it.each([
    { args: [] },
    { args: ['help'] },
    { args: ['--help'] },
    { args: ['-h'] },
  ])('shows help for $args', ({ args }) => {
    expect(resolveCliCommand(args)).toEqual({
      _tag: 'Success',
      output: expect.stringContaining('Usage: npx @nuxt/scripts <command>'),
    })
  })

  it('does not advertise the removed generate-secret command', () => {
    const result = resolveCliCommand([])

    expect(result.output).not.toContain('generate-secret')
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
