#!/usr/bin/env node
import process from 'node:process'
import { runCli } from '../dist/cli.mjs'

process.exitCode = runCli(process.argv.slice(2), {
  writeStdout: value => process.stdout.write(value),
  writeStderr: value => process.stderr.write(value),
})
