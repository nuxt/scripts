import type { ChildProcess } from 'node:child_process'
import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { appendFile, copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { parseArgs, promisify } from 'node:util'
import { Miniflare } from 'miniflare'

async function main() {
  const { values } = parseArgs({ options: {
    'nuxt': { type: 'string', default: '4.6.0' },
    'future': { type: 'boolean', default: false },
    'devtools': { type: 'boolean', default: false },
    'edge': { type: 'boolean', default: false },
    'devtools-disabled': { type: 'boolean', default: false },
    'mismatched-devtools': { type: 'boolean', default: false },
    'base': { type: 'string', default: '/' },
    'tarball': { type: 'string' },
    'assets-tarball': { type: 'string' },
  } })
  const nuxtVersion = values.nuxt || '4.6.0'
  const baseURL = values.base || '/'
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const scratch = process.env.RUNNER_TEMP || join(homedir(), 'scratch')
  await mkdir(scratch, { recursive: true })
  const consumer = await mkdtemp(join(scratch, 'nuxt-scripts-packed-'))
  const log = join(consumer, 'verification.log')
  const execute = promisify(execFile)

  async function run(args: string[], cwd = consumer, environment: NodeJS.ProcessEnv = {}): Promise<string> {
    await appendFile(log, `\npnpm ${args.join(' ')}\n`)
    const result = await execute('pnpm', args, { cwd, env: { ...process.env, ...environment }, maxBuffer: 32 * 1024 * 1024 }).catch(async (error) => {
      await appendFile(log, `${error.stdout || ''}\n${error.stderr || ''}\n`)
      throw error
    })
    await appendFile(log, result.stdout + result.stderr)
    return result.stdout
  }

  console.info(`Packed consumer: ${consumer}`)
  const tarball = values.tarball || join(consumer, 'scripts.tgz')
  if (!values.tarball)
    await run(['--filter', '@nuxt/scripts', 'pack', '--config.ignore-scripts=true', '--out', tarball], repo)
  const assetsTarball = values['assets-tarball'] || join(consumer, 'devtools.tgz')
  if (values.devtools && !values['assets-tarball'])
    await run(['--filter', '@nuxt/scripts-devtools', 'pack', '--config.ignore-scripts=true', '--out', assetsTarball], repo)
  if (values['mismatched-devtools']) {
    const mismatched = join(consumer, 'mismatched-panel')
    await mkdir(mismatched)
    await writeFile(join(mismatched, 'package.json'), JSON.stringify({
      name: '@nuxt/scripts-devtools',
      version: '0.0.0',
      exports: { './package.json': './package.json' },
    }))
    await run(['pack', '--config.ignore-scripts=true', '--out', assetsTarball], mismatched)
  }

  const nightly = nuxtVersion.startsWith('5.')
  const hostFixture = join(repo, 'test/packed/fixtures/nuxt-5')
  if (nightly) {
    const pinnedHost = JSON.parse(await readFile(join(hostFixture, 'package.json'), 'utf8'))
    assert.equal(pinnedHost.dependencies.nuxt, `npm:nuxt-nightly@${nuxtVersion}`, 'Use the committed nightly pin.')
    for (const file of ['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml'])
      await copyFile(join(hostFixture, file), join(consumer, file))
    await run(['install', '--frozen-lockfile'])
  }
  await writeFile(join(consumer, 'package.json'), JSON.stringify({
    name: 'nuxt-scripts-packed-consumer',
    private: true,
    type: 'module',
    packageManager: JSON.parse(await readFile(join(repo, 'package.json'), 'utf8')).packageManager,
    dependencies: {
      '@nuxt/scripts': `file:${tarball}`,
      ...(values.devtools || values['mismatched-devtools'] ? { '@nuxt/scripts-devtools': `file:${assetsTarball}` } : {}),
      'nuxt': nightly ? `npm:nuxt-nightly@${nuxtVersion}` : nuxtVersion,
      'vue': '3.5.43',
      '@unhead/vue': '3.4.2',
      'unhead': '3.4.2',
    },
    devDependencies: { 'vue-tsc': '3.3.11', 'typescript': 'npm:@typescript/typescript6@6.0.2', '@types/node': '26.5.1' },
  }, null, 2))
  // Keep the committed supply-chain policy and exact nightly approvals.
  await copyFile(join(hostFixture, 'pnpm-workspace.yaml'), join(consumer, 'pnpm-workspace.yaml'))
  // Extend the verified host lock with this run's unique local tarballs.
  await run(['install', '--no-frozen-lockfile'])
  await writeFile(join(consumer, 'dependencies.json'), await run(['list', '--prod', '--depth', 'Infinity', '--json']))
  await mkdir(join(consumer, 'app'), { recursive: true })
  await mkdir(join(consumer, 'app/pages'), { recursive: true })
  await mkdir(join(consumer, 'server/api'), { recursive: true })
  await writeFile(join(consumer, 'nuxt.config.ts'), `import { defineNuxtConfig } from 'nuxt/config'
  ${nightly
    ? `import NuxtScripts from '@nuxt/scripts'
  // Accept only this pinned prerelease in the fixture. Published peers remain stable ranges.
  if (!NuxtScripts.getMeta) throw new Error('Expected a Nuxt module with metadata.')
  const meta = await NuxtScripts.getMeta()
  meta.compatibility = { ...meta.compatibility, nuxt: ${JSON.stringify(nuxtVersion)} }
  `
    : ''}
  export default defineNuxtConfig({
    modules: ['@nuxt/scripts', './inspect-devtools.ts'],
    buildDir: '.nuxt',
    app: { baseURL: ${JSON.stringify(baseURL)} },
    future: { compatibilityVersion: ${nightly || values.future ? 5 : 4} },
    compatibilityDate: '2026-03-13',
    devtools: { enabled: ${!values['devtools-disabled']} },
    scripts: { registry: { gravatar: {} } },
  })
  `)
  await writeFile(join(consumer, 'inspect-devtools.ts'), `import type { Nuxt, NuxtHooks } from 'nuxt/schema'
  import { writeFileSync } from 'node:fs'
  export default function (_options: unknown, nuxt: Nuxt) {
    if (nuxt.options.dev) nuxt.hook('ready', async () => {
      const tabs: Parameters<NuxtHooks['devtools:customTabs']>[0] = []
      await nuxt.callHook('devtools:customTabs', tabs)
      writeFileSync(${JSON.stringify(join(consumer, 'devtools-tab.json'))}, JSON.stringify(tabs.find(tab => tab.name === 'nuxt-scripts') || null))
    })
  }
  `)
  await writeFile(join(consumer, 'app/app.vue'), '<template><NuxtPage /></template>')
  await writeFile(join(consumer, 'app/pages/index.vue'), `<script setup lang="ts">
  import { useScript } from '#nuxt-scripts/app'
  const script = useScript({ src: '/sdk.js' }, { trigger: 'manual' })
  </script>
  <template><main>packed-scripts-ready: {{ script.status.value }}</main></template>
  `)
  await writeFile(join(consumer, 'server/api/portable.get.ts'), `import { defineEventHandler, getQuery, useRuntimeConfig } from 'nuxt/server'
  import { defineCachedFunction, useNitroApp } from '#nuxt-scripts/nitro'
  const cached = defineCachedFunction(() => 'cached', { name: 'packed-proof' })
  export default defineEventHandler(async event => {
    event.res.headers.set('x-portable', 'yes')
    return { cache: await cached(), app: Boolean(useNitroApp()), config: Boolean(useRuntimeConfig().public), query: getQuery(event), header: event.req.headers.get('x-probe') }
  })
  `)
  await writeFile(join(consumer, 'server/api/echo.post.ts'), `import { defineEventHandler, readBody } from 'nuxt/server'
  export default defineEventHandler(event => readBody(event))
  `)
  await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify({ files: [], references: ['app', 'server', 'shared', 'node'].map(name => ({ path: `./.nuxt/tsconfig.${name}.json` })) }))
  await run(['exec', 'nuxt', 'prepare'])
  for (const context of ['app', 'server', 'shared', 'node'])
    await run(['exec', 'vue-tsc', '--noEmit', '-p', `.nuxt/tsconfig.${context}.json`])
  await run(['exec', 'nuxt', 'build'])

  async function unusedPort(): Promise<number> {
    const socket = createServer()
    await new Promise<void>(resolve => socket.listen(0, '127.0.0.1', resolve))
    const address = socket.address()
    assert(address && typeof address === 'object')
    await new Promise<void>((resolve, reject) => socket.close(error => error ? reject(error) : resolve()))
    return address.port
  }

  async function serve(command: string, args: string[], check: (origin: string) => Promise<void>): Promise<void> {
    const port = await unusedPort()
    const child: ChildProcess = spawn(command, args.map(arg => arg === '$PORT' ? String(port) : arg), {
      cwd: consumer,
      env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', NODE_ENV: command === 'pnpm' ? 'development' : 'production' },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    })
    let output = ''
    child.stdout?.on('data', chunk => output += chunk)
    child.stderr?.on('data', chunk => output += chunk)
    const exited = new Promise<void>(resolve => child.once('close', () => resolve()))
    const origin = `http://127.0.0.1:${port}`
    try {
      for (let attempt = 0; ; attempt++) {
        if (child.exitCode !== null || attempt === 100)
          throw new Error(`Consumer did not start. ${output}`)
        const response = await fetch(origin + baseURL).catch((error: Error & { cause?: { code?: string } }) => {
          if (error.cause?.code === 'ECONNREFUSED')
            return undefined
          throw error
        })
        if (response) {
          const html = await response.text()
          if (response.status === 200 && html.includes('packed-scripts-ready'))
            break
          if (response.status !== 503)
            assert.equal(response.status, 200, html)
        }
        await setTimeout(300)
      }
      await check(origin)
    }
    finally {
      if (process.platform !== 'win32' && child.pid)
        process.kill(-child.pid, 'SIGTERM')
      else
        child.kill('SIGTERM')
      await exited
      await appendFile(log, output)
    }
  }

  await serve(process.execPath, ['.output/server/index.mjs'], async (origin) => {
    const response = await fetch(`${origin}${baseURL}api/portable?tag=a&tag=b`, { headers: { 'x-probe': 'isolated' } })
    assert.equal(response.headers.get('x-portable'), 'yes')
    assert.deepEqual(await response.json(), { cache: 'cached', app: true, config: true, query: { tag: ['a', 'b'] }, header: 'isolated' })
    const html = await fetch(origin + baseURL).then(response => response.text())
    assert.match(html, /packed-scripts-ready/)
    assert.equal((await fetch(`${origin}${baseURL}_scripts/p/127.0.0.1/private`)).status, 403)
    assert.equal((await fetch(`${origin}${baseURL}_scripts/proxy/gravatar?hash=invalid`)).status, 400)
    const body = await fetch(`${origin}${baseURL}api/echo`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"a":1}' })
    assert.deepEqual(await body.json(), { a: 1 })
    assert.equal((await fetch(`${origin}${baseURL}api/echo`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' })).status, 400)
    assert.equal((await fetch(`${origin}${baseURL}__nuxt-scripts-api/state`)).status, 404)
  })
  await run(['exec', 'nuxt', 'generate'])
  const prerendered = await readFile(join(consumer, '.output/public/index.html'), 'utf8')
  assert.match(prerendered, /packed-scripts-ready/)

  if (values.edge) {
    await run(['exec', 'nuxt', 'build'], consumer, { NITRO_PRESET: 'cloudflare_module' })
    const worker = new Miniflare({
      modules: true,
      scriptPath: join(consumer, '.output/server/index.mjs'),
      modulesRoot: join(consumer, '.output/server'),
      compatibilityDate: '2026-03-13',
      compatibilityFlags: ['nodejs_compat'],
    })
    try {
      const response = await worker.dispatchFetch(`https://packed.test${baseURL}api/portable?tag=a&tag=b`, { headers: { 'x-probe': 'workerd' } })
      assert.equal(response.headers.get('x-portable'), 'yes')
      assert.deepEqual(await response.json(), { cache: 'cached', app: true, config: true, query: { tag: ['a', 'b'] }, header: 'workerd' })
      const body = await worker.dispatchFetch(`https://packed.test${baseURL}api/echo`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"edge":true}' })
      assert.deepEqual(await body.json(), { edge: true })
      assert.equal((await worker.dispatchFetch(`https://packed.test${baseURL}_scripts/p/127.0.0.1/private`)).status, 403)
    }
    finally {
      await worker.dispose()
    }
  }

  await serve('pnpm', ['exec', 'nuxt', 'dev', '--host', '127.0.0.1', '--port', '$PORT'], async (origin) => {
    const response = await fetch(`${origin}${baseURL}api/portable?tag=dev`, { headers: { 'x-probe': 'development' } })
    assert.deepEqual(await response.json(), { cache: 'cached', app: true, config: true, query: { tag: 'dev' }, header: 'development' })
    const tab = JSON.parse(await readFile(join(consumer, 'devtools-tab.json'), 'utf8'))
    if (values['devtools-disabled']) {
      assert.equal(tab, null)
      assert.equal((await fetch(`${origin}/__nuxt-scripts/`)).status, 404)
      return
    }
    assert.equal(tab.view.type, values.devtools ? 'iframe' : 'launch')
    if (values.devtools) {
      const panel = await fetch(origin + tab.view.src)
      assert.equal(panel.status, 200)
      const html = await panel.text()
      assert.match(html, /_nuxt\//)
      const asset = html.match(/(?:src|href)="([^"]+\.(?:js|css))"/)?.[1]
      assert(asset)
      assert.equal((await fetch(new URL(asset, origin))).status, 200)
    }
    else {
      assert.match(tab.view.description, /@nuxt\/scripts-devtools@2\.0\.0-beta\.12/)
      if (values['mismatched-devtools'])
        assert.match(tab.view.description, /does not match/)
    }
  })
  console.info(`Verified Node ${process.version}, Nuxt ${nuxtVersion}, future ${values.future}, DevTools ${values.devtools}, base ${baseURL}.`)
  console.info(`Evidence: ${log}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
