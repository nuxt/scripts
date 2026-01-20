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

export {}
