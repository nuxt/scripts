// runtime types are not working for some reason

declare module '#app' {
  interface NuxtApp {
    _scripts: Record<string, (import('#nuxt-scripts').NuxtAppScript)>
  }
  interface RuntimeNuxtHooks {
    'scripts:updated': (ctx: { scripts: Record<string, (import('#nuxt-scripts').NuxtAppScript)> }) => void | Promise<void>
  }
}

export {}
