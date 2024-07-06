import { hash } from 'ohash'
import type { ModuleOptions } from './module'
import { logger } from './logger'
import type { RegistryScript } from '#nuxt-scripts'

export function templatePlugin(config: Partial<ModuleOptions>, registry: Required<RegistryScript>[]) {
  if (Array.isArray(config.globals)) {
    // convert to object
    config.globals = Object.fromEntries(config.globals.map(i => [hash(i), i]))
    logger.warn('The `globals` array option is deprecated, please convert to an object.')
  }
  const imports = ['useScript', 'defineNuxtPlugin']
  const inits = []
  // for global scripts, we can initialise them script away
  for (const [k, c] of Object.entries(config.registry || {})) {
    const importDefinition = registry.find(i => i.import.name === `useScript${k.substring(0, 1).toUpperCase() + k.substring(1)}`)
    if (importDefinition) {
      // title case
      imports.unshift(importDefinition.import.name)
      const args = (typeof c !== 'object' ? {} : c) || {}
      if (c === 'mock')
        args.scriptOptions = { trigger: 'manual', skipValidation: true }
      inits.push(`const ${k} = ${importDefinition.import.name}(${JSON.stringify(args)})`)
    }
  }
  for (const [k, c] of Object.entries(config.globals || {})) {
    if (typeof c === 'string') {
      inits.push(`const ${k} = useScript(${JSON.stringify({ src: c, key: k })}, { use: () => ({ ${k}: window.${k} }) })`)
    }
    else if (Array.isArray(c) && c.length === 2) {
      inits.push(`const ${k} = useScript(${JSON.stringify({ key: k, ...(typeof c[0] === 'string' ? { src: c[0] } : c[0]) })}, { ...${JSON.stringify(c[1])}, use: () => ({ ${k}: window.${k} }) })`)
    }
    else {
      inits.push(`const ${k} = useScript(${JSON.stringify({ key: k, ...c })}, { use: () => ({ ${k}: window.${k} }) })`)
    }
  }
  return [
    `import { ${imports.join(', ')} } from '#imports'`,
    '',
    `export default defineNuxtPlugin({`,
    `  name: "scripts:init",`,
    `  env: { islands: false },`,
    `  parallel: true,`,
    `  setup() {`,
    ...inits.map(i => `    ${i}`),
    `    return { provide: { $scripts: { ${[...Object.keys(config.globals || {}), ...Object.keys(config.registry || {})].join(', ')} } } }`,
    `  }`,
    `})`,
  ].join('\n')
}
