---
title: Gravatar
description: Add Gravatar avatars and hovercards to your Nuxt app with privacy-preserving server-side proxying.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/gravatar.ts
  size: xs
- label: Gravatar Developer Docs
  icon: i-simple-icons-gravatar
  to: https://docs.gravatar.com/
  size: xs
---

[Gravatar](https://gravatar.com) provides globally recognized avatars linked to email addresses. Nuxt Scripts provides a privacy-preserving integration that proxies avatar requests through your own server, preventing Gravatar from tracking your users.

## Privacy Benefits

When using the Gravatar proxy:

- **User IPs are hidden** from Gravatar's servers
- **Email hashes stay server-side** — the `?email=` parameter is SHA256-hashed on YOUR server, so hashes never appear in client HTML
- **Hovercards JS is bundled** through your domain via firstParty mode
- **Configurable caching** reduces requests to Gravatar

## Nuxt Config Setup

Enable the Gravatar proxy in your `nuxt.config.ts`:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      gravatar: true
    },
    gravatarProxy: {
      enabled: true,
      cacheMaxAge: 3600 // 1 hour (default)
    }
  }
})
```

## useScriptGravatar

The `useScriptGravatar` composable loads the Gravatar hovercards script and provides avatar URL helpers.

```ts
const { proxy } = useScriptGravatar()

// Get avatar URL from a pre-computed SHA256 hash
const url = proxy.getAvatarUrl('sha256hash', { size: 200 })

// Get avatar URL from email (hashed server-side)
const url = proxy.getAvatarUrlFromEmail('user@example.com', { size: 200 })
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### GravatarApi

```ts
export interface GravatarApi {
  getAvatarUrl: (hash: string, options?: {
    size?: number
    default?: string
    rating?: string
  }) => string
  getAvatarUrlFromEmail: (email: string, options?: {
    size?: number
    default?: string
    rating?: string
  }) => string
}
```

### Config Schema

```ts
export const GravatarOptions = object({
  cacheMaxAge: optional(number()),
  default: optional(string()),  // 'mp', '404', 'robohash', etc.
  size: optional(number()),     // 1-2048
  rating: optional(string()),   // 'g', 'pg', 'r', 'x'
})
```

## ScriptGravatar Component

The `<ScriptGravatar>` component provides a simple way to render Gravatar avatars:

```vue
<template>
  <!-- By email (server-side hashed) -->
  <ScriptGravatar email="user@example.com" :size="80" />

  <!-- By pre-computed hash -->
  <ScriptGravatar hash="sha256hash" :size="80" />

  <!-- With hovercards enabled -->
  <ScriptGravatar email="user@example.com" hovercards />
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `email` | `string` | — | Email address (hashed server-side, never exposed in HTML) |
| `hash` | `string` | — | Pre-computed SHA256 email hash |
| `size` | `number` | `80` | Avatar size in pixels |
| `default` | `string` | `'mp'` | Default image when no Gravatar exists |
| `rating` | `string` | `'g'` | Content rating filter |
| `hovercards` | `boolean` | `false` | Add hovercards class for profile pop-ups |

## Example

### Basic Avatar with Proxy

```vue
<script setup lang="ts">
const { proxy } = useScriptGravatar()

const avatarUrl = computed(() =>
  proxy.getAvatarUrlFromEmail('user@example.com', { size: 200 })
)
</script>

<template>
  <img :src="avatarUrl" alt="User avatar" />
</template>
```

### With Hovercards

Load the Gravatar hovercards script to show profile pop-ups on hover:

```vue
<script setup lang="ts">
const { status } = useScriptGravatar()
</script>

<template>
  <div>
    <ScriptGravatar
      email="user@example.com"
      :size="80"
      hovercards
    />
    <p>Hovercards script: {{ status }}</p>
  </div>
</template>
```

## Gravatar Proxy Server Handler

The proxy handler at `/_scripts/gravatar-proxy` accepts:

| Parameter | Description |
|-----------|-------------|
| `hash` | SHA256 email hash |
| `email` | Raw email (hashed server-side) |
| `s` | Size in pixels (default: 80) |
| `d` | Default image (default: mp) |
| `r` | Rating filter (default: g) |

```
/_scripts/gravatar-proxy?email=user@example.com&s=200&d=mp&r=g
/_scripts/gravatar-proxy?hash=abc123...&s=80
```
