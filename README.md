# Nuxt Scripts, Assets and Third Parties

Work in progress for the development of the following modules
- Nuxt Assets - Improved loading options for assets (proxy, inline, etc)
- Nuxt Third Parties - Simple optimised wrappers for third parties

# Nuxt Scripts

Nuxt Scripts, for now is a simple composable - `useScript`.

## Features

- 🪄 Queues API calls while scripts are loading, doesn't break your app if it fails
- 🪝 Trigger scripts when _you_ need them (`idle`, `manual`)
- 💎 Load scripts from SSR or CSR with consistent events (`load`, `error`)
- 🌐 Serve scripts from your domain using asset strategies (`inline`, `proxy`)

## Future Features (ideas welcome)

- 🔒 Lock down your site with Content Security Policy integration
- Load scripts from nuxt.config with `scripts.globals`
- ?? (ideas welcome)


## useScript

`useScript` provides an API similar to `useHead`, it's specifically built for
loading non-bundled IIFE scripts that have an API that you want to use in your app.

For example, Google Analytics, Stripe, etc.

### Usage

To use external API functions before the script has loaded, there are three required options:
- `key` - A unique key for the script
- `script` - The script options, this is the same as the `script` option for `useHead`
- `use` - A function that resolves the scripts API

```vue
<script lang="ts" setup>
import { useScript } from '#imports'

const script = useScript({
  key: 'google-analytics',
  script: {
    src: 'https://www.google-analytics.com/analytics.js',
  },
  use: () => window.gtag
})
</script>
```

### Options

Extends the Script options for `useHead` with the following extras:
- `loadingStrategy` - When to load the script
- `assetStrategy` - How to load the script
- 

### Load Strategy

- `idle` - Load the script when the browser is idle

### Asset Strategy

- `inline` - Inline the script
- `proxy` - Proxy the script

### Universal load / error events

- SSR won't trigger load events
- Hydration of SSR tags will trigger artificial load / error events
- CSR will trigger native load / error events


# Nuxt Third Parties

## Scripts

A thin wrapper around third-party scripts providing optimised loading, SSR support and a proxied API.

Requires `@nuxt/scripts`.

### Global Scripts

Load scripts in globally from nuxt.config, tree-shakes them appropriately depending on build

```ts
export default defineNuxtConfig({
  scripts: {
    globals: {
      googleAnalytics: {
        id: 'UA-XXXXXX-X'
      }
    }
  }
})
```

Use the API within your app without needing to provide the id or triggering a reload.

```vue
<script lang="ts" setup>
function someEvent() {
  const { gtag } = useGoogleAnalytics()
  gtag('event', 'some_event')
}
</script>
```

### On Demand Scripts

Load scripts on demand from within your app.

```vue
<script lang="ts" setup>
const { $script, gtag } = useGoogleAnalytics({
  id: 'UA-XXXXXX-X',
  // can use any of the load strategies
  loadingStrategy: 'idle'
})
// we can start using gtag before the script has loaded, it will be queued and sent once the script has loaded
gtag('pageview', '/some/page')
$script.waitForLoad().then(() => {
  console.log('Google Analytics loaded', window.gtag)
})
</script>
```

They can be used from separate components and will be deduped.

```vue
<script lang="ts" setup>
// doesn't need an id as it's already been registered
const { gtag } = useGoogleAnalytics()
function someEvent() {
  gtag('event', 'some_event')
}
</script>
```

### Proxied API

- Function calls in unsupported environments (server side)
- Queued function calls for when the script has loaded (i.e send analytic events once a consent is agreed)
- Use functions when browser extensions may have blocked the library 

# Nuxt Assets

## 
