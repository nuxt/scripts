import type { ModuleOptions } from './module'
import type { RegistryScript } from '#nuxt-scripts'

export function templatePlugin(config: Partial<ModuleOptions>, registry: Required<RegistryScript>[]) {
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
      inits.push(`    ${importDefinition.import.name}(${JSON.stringify(args)})`)
    }
  }
  const useScriptStatements = (config.globals || []).map(g => typeof g === 'string'
    ? `    useScript("${g.toString()}")`
    : Array.isArray(g) && g.length === 2
      ? `    useScript(${JSON.stringify(g[0])}, ${JSON.stringify(g[1])} })`
      : `    useScript(${JSON.stringify(g)})`)
  return [
    `import { ${imports.join(', ')} } from '#imports'`,
    '',
    `export default defineNuxtPlugin({`,
    `  name: "scripts:init",`,
    `  env: { islands: false },`,
    `  parallel: true,`,
    `  setup() {`,
    ...useScriptStatements,
    ...inits,
    `  }`,
    `})`,
  ].join('\n')
}
