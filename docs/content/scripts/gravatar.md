---
title: Gravatar
description: Render server-hashed, proxied Gravatar images from an email or hash.
links:
- label: Source
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/gravatar.ts
  size: xs
- label: "<ScriptGravatar>"
  icon: i-simple-icons-github
  to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/ScriptGravatar.vue
  size: xs
---

[Gravatar](https://gravatar.com) provides globally recognized avatars linked to email addresses. Its [avatar API](https://docs.gravatar.com/sdk/images/) uses a SHA-256 hash of the normalized email address. Nuxt Scripts creates that hash on your server and proxies the image request.

::script-stats
::

::script-docs
::

::callout{type="info"}
This script's proxy endpoints use [HMAC URL signing](/docs/guides/first-party#proxy-endpoint-security) when you configure a `NUXT_SCRIPTS_PROXY_SECRET`. See the [security guide](/docs/guides/first-party#proxy-endpoint-security) for setup instructions.
::

## [`<ScriptGravatar>`{lang="html"}](/scripts/gravatar){lang="html"}

The [`<ScriptGravatar>`{lang="html"}](/scripts/gravatar){lang="html"} component renders a Gravatar avatar for a given email address. The avatar image request is proxied through your server, so Gravatar does not receive the user's IP address from that request.

Passing `email` puts the raw address in the same-origin image URL before the server hashes it. That URL can appear in browser, CDN, and server access logs. Pass a precomputed `hash` when the address should not enter those logs.

::callout{type="warning"}
The integration also loads Gravatar's `gprofiles.js` directly for hovercard support, even when `hovercards` is `false`. The browser therefore still connects to Gravatar.
::

### Demo

::code-group

:gravatar-demo{label="Output"}

```vue [Input]
<template>
  <ScriptGravatar
    email="info@gravatar.com"
    :size="80"
    class="rounded-full"
  />
</template>
```

::

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `email` | `string` | - | Email address, sent to your server proxy for hashing, not sent to Gravatar |
| `hash` | `string` | - | Precomputed SHA-256 hash of the email (alternative to `email`) |
| `size` | `number` | `80` | Avatar size in pixels |
| `default` | `string` | `'mp'` | Default avatar style when no Gravatar exists |
| `rating` | `string` | `'g'` | Content rating filter |
| `hovercards` | `boolean` | `false` | Enable hovercards on hover |

## [`useScriptGravatar()`{lang="ts"}](/scripts/gravatar){lang="ts"}

The [`useScriptGravatar()`{lang="ts"}](/scripts/gravatar){lang="ts"} composable builds proxied avatar URLs from an email address or hash.

```ts
export function useScriptGravatar<T extends GravatarApi>(_options?: GravatarInput) {}
```

See [Registry Scripts](/docs/guides/registry-scripts) for trigger and loading options.

::script-types
::

## Example

Build an avatar URL after the Gravatar script loads:

```vue
<script setup lang="ts">
const { onLoaded } = useScriptGravatar()

const avatarUrl = ref('')

onLoaded((api) => {
  avatarUrl.value = api.getAvatarUrlFromEmail('user@example.com', { size: 120 })
})
</script>

<template>
  <img v-if="avatarUrl" :src="avatarUrl" alt="User avatar">
</template>
```
