import { hash } from 'ohash'
import type { ModuleOptions } from './module'
import { logger } from './logger'
import type { RegistryScript } from '#nuxt-scripts/types'
import { tryUseNuxt } from '@nuxt/kit'
import { relative } from 'pathe'

export function resolveTriggerForTemplate(trigger: any): string | null {
  if (trigger && typeof trigger === 'object') {
    const keys = Object.keys(trigger)
    if (keys.length > 1) {
      throw new Error(`Trigger object must have exactly one property, received: ${keys.join(', ')}`)
    }
    if ('idleTimeout' in trigger) {
      return `useScriptTriggerIdleTimeout({ timeout: ${trigger.idleTimeout} })`
    }
    if ('interaction' in trigger) {
      return `useScriptTriggerInteraction({ events: ${JSON.stringify(trigger.interaction)} })`
    }
  }
  return null
}

export function templatePlugin(config: Partial<ModuleOptions>, registry: Required<RegistryScript>[]) {
  if (Array.isArray(config.globals)) {
    // convert to object
    config.globals = Object.fromEntries(config.globals.map(i => [hash(i), i]))
    logger.warn('The `globals` array option is deprecated, please convert to an object.')
  }
  // handles tests
  const nuxt = tryUseNuxt() || { options: { buildDir: import.meta.dirname } }
  const buildDir = nuxt.options.buildDir
  const imports = []
  const inits = []
  let needsIdleTimeoutImport = false
  let needsInteractionImport = false

  // for global scripts, we can initialise them script away
  for (const [k, c] of Object.entries(config.registry || {})) {
    const importDefinition = registry.find(i => i.import.name === `useScript${k.substring(0, 1).toUpperCase() + k.substring(1)}`)
    if (importDefinition) {
      // title case
      imports.unshift(`import { ${importDefinition.import.name} } from '${relative(buildDir, importDefinition.import.from)}'`)
      const args = (typeof c !== 'object' ? {} : c) || {}
      if (c === 'mock') {
        args.scriptOptions = { trigger: 'manual', skipValidation: true }
      }
      else if (Array.isArray(c) && c.length === 2 && c[1]?.trigger) {
        const triggerResolved = resolveTriggerForTemplate(c[1].trigger)
        if (triggerResolved) {
          args.scriptOptions = { ...c[1] } as any
          // Store the resolved trigger as a string that will be replaced later
          if (args.scriptOptions) {
            args.scriptOptions.trigger = `__TRIGGER_${triggerResolved}__` as any
          }
          if (triggerResolved.includes('useScriptTriggerIdleTimeout')) needsIdleTimeoutImport = true
          if (triggerResolved.includes('useScriptTriggerInteraction')) needsInteractionImport = true
        }
      }
      inits.push(`const ${k} = ${importDefinition.import.name}(${JSON.stringify(args).replace(/"__TRIGGER_(.*?)__"/g, '$1')})`)
    }
  }
  for (const [k, c] of Object.entries(config.globals || {})) {
    if (typeof c === 'string') {
      inits.push(`const ${k} = useScript(${JSON.stringify({ src: c, key: k })}, { use: () => ({ ${k}: window.${k} }) })`)
    }
    else if (Array.isArray(c) && c.length === 2) {
      const options = c[1]
      const triggerResolved = resolveTriggerForTemplate(options?.trigger)
      if (triggerResolved) {
        if (triggerResolved.includes('useScriptTriggerIdleTimeout')) needsIdleTimeoutImport = true
        if (triggerResolved.includes('useScriptTriggerInteraction')) needsInteractionImport = true
        const resolvedOptions = { ...options, trigger: `__TRIGGER_${triggerResolved}__` } as any
        inits.push(`const ${k} = useScript(${JSON.stringify({ key: k, ...(typeof c[0] === 'string' ? { src: c[0] } : c[0]) })}, { ...${JSON.stringify(resolvedOptions).replace(/"__TRIGGER_(.*?)__"/g, '$1')}, use: () => ({ ${k}: window.${k} }) })`)
      }
      else {
        inits.push(`const ${k} = useScript(${JSON.stringify({ key: k, ...(typeof c[0] === 'string' ? { src: c[0] } : c[0]) })}, { ...${JSON.stringify(c[1])}, use: () => ({ ${k}: window.${k} }) })`)
      }
    }
    else if (typeof c === 'object' && c !== null) {
      const triggerResolved = resolveTriggerForTemplate((c as any).trigger)
      if (triggerResolved) {
        if (triggerResolved.includes('useScriptTriggerIdleTimeout')) needsIdleTimeoutImport = true
        if (triggerResolved.includes('useScriptTriggerInteraction')) needsInteractionImport = true
        const resolvedOptions = { ...c, trigger: `__TRIGGER_${triggerResolved}__` } as any
        inits.push(`const ${k} = useScript(${JSON.stringify({ key: k, ...resolvedOptions }).replace(/"__TRIGGER_(.*?)__"/g, '$1')}, { use: () => ({ ${k}: window.${k} }) })`)
      }
      else {
        inits.push(`const ${k} = useScript(${JSON.stringify({ key: k, ...c })}, { use: () => ({ ${k}: window.${k} }) })`)
      }
    }
  }
  // Add conditional imports for trigger composables
  const triggerImports = []
  if (needsIdleTimeoutImport) {
    triggerImports.push(`import { useScriptTriggerIdleTimeout } from '#nuxt-scripts/composables/useScriptTriggerIdleTimeout'`)
  }
  if (needsInteractionImport) {
    triggerImports.push(`import { useScriptTriggerInteraction } from '#nuxt-scripts/composables/useScriptTriggerInteraction'`)
  }

  return [
    `import { useScript } from '#nuxt-scripts/composables/useScript'`,
    `import { defineNuxtPlugin } from 'nuxt/app'`,
    ...triggerImports,
    ...imports,
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
