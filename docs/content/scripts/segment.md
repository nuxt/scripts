---

title: Segment
description: Use Segment in your Nuxt app.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/segment.ts
  size: xs

---

[Segment](https://segment.com/) lets you collect, clean, and control your customer data. Segment helps you to understand your customers and personalize their experience.

Nuxt Scripts provides a registry script composable [`useScriptSegment()`](/scripts/segment){lang="ts"} to easily integrate Segment in your Nuxt app.

::script-stats
::

::script-docs
::

### SegmentApi

```ts
interface SegmentApi {
  track: (event: string, properties?: Record<string, any>) => void
  page: (name?: string, properties?: Record<string, any>) => void
  identify: (userId: string, traits?: Record<string, any>, options?: Record<string, any>) => void
  group: (groupId: string, traits?: Record<string, any>, options?: Record<string, any>) => void
  alias: (userId: string, previousId: string, options?: Record<string, any>) => void
  reset: () => void
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const SegmentOptions = object({
  writeKey: string(),
  analyticsKey: optional(string()),
})
```
