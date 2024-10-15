// runtime types are not working for some reason

declare module '#app' {
  interface NuxtApp {
    _scripts: Record<string, (import('#nuxt-scripts').NuxtDevToolsScriptInstance)>
    $scripts: Record<string, any>
  }
  interface RuntimeNuxtHooks {
    'scripts:updated': (ctx: { scripts: Record<string, (import('#nuxt-scripts').NuxtDevToolsScriptInstance)> }) => void | Promise<void>
  }
}

export {}
