---

title: Fathom Analytics
description: Use Fathom Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/fathom-analytics.ts
    size: xs

---

[Fathom Analytics](https://usefathom.com/) is a great privacy analytics solution for your Nuxt app. It doesn't gather personal data from your visitors, yet provides detailed insights into how visitors use your site.

::script-stats
::

::script-docs
::

## Defaults

- **Trigger**: Script will load when Nuxt is hydrated.

::script-types
::

You can access the `fathom` object as a proxy directly or await the `$script` promise to access the object. It's recommended
to use the proxy for any void functions.

::code-group

```ts [Proxy]
const { proxy } = useScriptFathomAnalytics()
function trackMyGoal() {
  proxy.trackGoal('MY_GOAL_ID', 100)
}
```

```ts [onLoaded]
const { onLoaded } = useScriptFathomAnalytics()
onLoaded(({ trackGoal }) => {
  trackGoal('MY_GOAL_ID', 100)
})
```

::

## Example

Loading Fathom Analytics through the `app.vue` when Nuxt is ready.

```vue [app.vue]
<script setup>
useScriptFathomAnalytics({
  site: 'YOUR_SITE_ID',
  scriptOptions: {
    trigger: 'onNuxtReady'
  }
})
</script>
```
