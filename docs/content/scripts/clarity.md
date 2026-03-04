---

title: Clarity
description: Use Clarity in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/clarity.ts
  size: xs

---

[Clarity](https://clarity.microsoft.com/) by Microsoft is a screen recorder and heatmap tool that helps you understand how users interact with your website.

::script-docs
::

### ClarityApi

```ts
type ClarityFunctions = ((fn: 'start', options: { content: boolean, cookies: string[], dob: number, expire: number, projectId: string, upload: string }) => void)
  & ((fn: 'identify', id: string, session?: string, page?: string, userHint?: string) => Promise<{
  id: string
  session: string
  page: string
  userHint: string
}>)
  & ((fn: 'consent') => void)
  & ((fn: 'set', key: any, value: any) => void)
  & ((fn: 'event', value: any) => void)
  & ((fn: 'upgrade', upgradeReason: any) => void)
  & ((fn: string, ...args: any[]) => void)

export interface ClarityApi {
  clarity: ClarityFunctions & {
    q: any[]
    v: string
  }
}

```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const ClarityOptions = object({
  /**
   * The Clarity token.
   */
  id: pipe(string(), minLength(10)),
})
```
