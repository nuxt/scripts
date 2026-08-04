import { findPackageJSON } from 'node:module'
import { pathToFileURL } from 'node:url'
import { logger, tryUseNuxt } from '@nuxt/kit'
import { isCI, provider } from 'std-env'

const isStackblitz = provider === 'stackblitz'

interface EnsurePackageInstalledOptions {
  rootDir: string
  searchPaths?: string[]
  prompt?: boolean
}

async function promptToInstall(name: string, installCommand: () => Promise<void>, options: EnsurePackageInstalledOptions) {
  const installed = [options.rootDir, ...(options.searchPaths || [])].some((searchPath) => {
    try {
      return !!findPackageJSON(name, pathToFileURL(`${searchPath.replace(/\/$/, '')}/`))
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND')
        return false
      throw error
    }
  })
  if (installed) {
    return true
  }

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
