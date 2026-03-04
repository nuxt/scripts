---

title: Hotjar
description: Use Hotjar in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/hotjar.ts
  size: xs

---

[Hotjar](https://www.hotjar.com/) is a screen recorder and heatmap tool that helps you understand how users interact with your website.

::script-stats
::

::script-docs
::

### HotjarApi

```ts
export interface HotjarApi {
  hj: ((event: 'identify', userId: string, attributes?: Record<string, any>) => void)
  & ((event: 'stateChange', path: string) => void)
  & ((event: 'event', eventName: string) => void)
  & ((event: string, arg?: string) => void)
  & ((...params: any[]) => void) & {
    q: any[]
  }
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const HotjarOptions = object({
  id: number(),
  sv: optional(number()),
})
```
