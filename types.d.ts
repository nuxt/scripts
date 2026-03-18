// runtime types are not working for some reason

declare module '#app' {
  interface NuxtApp {
    _scripts: Record<string, import('#nuxt-scripts/types').NuxtDevToolsScriptInstance>
    $scripts: Record<string, import('#nuxt-scripts/types').UseScriptContext<any> | undefined>
  }
  interface RuntimeNuxtHooks {
    'scripts:updated': (ctx: { scripts: Record<string, import('#nuxt-scripts/types').NuxtDevToolsScriptInstance> }) => void | Promise<void>
  }
}

declare module '@nuxt/schema' {
  interface NuxtHooks {
    'scripts:registry': (registry: import('./src/runtime/types').RegistryScripts) => void | Promise<void>
  }
}

export {}
