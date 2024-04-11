import { addTemplate, createResolver, logger, tryUseNuxt, useNuxt } from '@nuxt/kit'
import { relative } from 'pathe'
import { resolvePackageJSON } from 'pkg-types'
import { isCI, provider } from 'std-env'

export function extendTypes(module: string, template: (options: { typesPath: string }) => Promise<string> | string) {
  const nuxt = useNuxt()
  const { resolve } = createResolver(import.meta.url)
  // paths.d.ts
  addTemplate({
    filename: `modules/${module.replace('/', '-')}.d.ts`,
    getContents: async () => {
      const typesPath = relative(resolve(nuxt!.options.rootDir, nuxt!.options.buildDir, 'module'), resolve('runtime/types'))
      const s = await template({ typesPath })
      return `// Generated by ${module}
${s}
export {}
`
    },
  })

  nuxt.hooks.hook('prepare:types', ({ references }) => {
    references.push({ path: resolve(nuxt.options.buildDir, `module/${module}.d.ts`) })
  })
}

const isStackblitz = provider === 'stackblitz'

interface EnsurePackageInstalledOptions {
  rootDir: string
  searchPaths?: string[]
  prompt?: boolean
}

async function promptToInstall(name: string, installCommand: () => Promise<void>, options: EnsurePackageInstalledOptions) {
  if (await resolvePackageJSON(name, { url: options.searchPaths }).catch(() => null))
    return true

  logger.info(`Package ${name} is missing`)
  if (isCI)
    return false

  // In StackBlitz we install packages automatically by default
  if (options.prompt === true || (options.prompt !== false && !isStackblitz)) {
    const confirm = await logger.prompt(`Do you want to install ${name} package?`, {
      type: 'confirm',
      name: 'confirm',
      initial: true,
    })

    if (!confirm)
      return false
  }

  logger.info(`Installing ${name}...`)
  try {
    await installCommand()
    logger.success(`Installed ${name}`)
    return true
  }
  catch (err) {
    logger.error(err)
    return false
  }
}

// TODO: refactor to Nuxi
const installPrompts = new Set<string>()
export function installNuxtModule(name: string, options?: EnsurePackageInstalledOptions) {
  if (installPrompts.has(name))
    return
  installPrompts.add(name)
  const nuxt = tryUseNuxt()
  if (!nuxt)
    return
  return promptToInstall(name, async () => {
    const { runCommand } = await import(String('nuxi'))
    await runCommand('module', ['add', name, '--cwd', nuxt.options.rootDir])
  }, { rootDir: nuxt.options.rootDir, searchPaths: nuxt.options.modulesDir, ...options })
}