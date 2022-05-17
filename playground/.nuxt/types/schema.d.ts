import { NuxtModule } from '@nuxt/schema'
declare module '@nuxt/schema' {
  interface NuxtConfig {
    ["myModule"]?: typeof import("@nuxt/script").default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>
  }
}