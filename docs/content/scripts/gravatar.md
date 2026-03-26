---
title: Gravatar
description: Use Gravatar in your Nuxt app.
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

[Gravatar](https://gravatar.com) provides globally recognized avatars linked to email addresses. Nuxt Scripts provides a privacy-preserving integration that proxies avatar requests through your own server, preventing Gravatar from tracking your users.

::script-stats
::

::script-docs
::

## [`<ScriptGravatar>`{lang="html"}](/scripts/gravatar){lang="html"}

The [`<ScriptGravatar>`{lang="html"}](/scripts/gravatar){lang="html"} component renders a Gravatar avatar for a given email address. All requests are proxied through your server - Gravatar never sees your user's IP address or headers.

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

### Component API

See the [Facade Component API](/docs/guides/facade-components#facade-components-api) for full props, events, and slots.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `email` | `string` |, | Email address, sent to your server proxy for hashing, not sent to Gravatar |
| `hash` | `string` | - | Pre-computed SHA256 hash of the email (alternative to `email`) |
| `size` | `number` | `80` | Avatar size in pixels |
| `default` | `string` | `'mp'` | Default avatar style when no Gravatar exists |
| `rating` | `string` | `'g'` | Content rating filter |
| `hovercards` | `boolean` | `false` | Enable hovercards on hover |

## [`useScriptGravatar()`{lang="ts"}](/scripts/gravatar){lang="ts"}

The [`useScriptGravatar()`{lang="ts"}](/scripts/gravatar){lang="ts"} composable lets you interact with the Gravatar API programmatically.

```ts
export function useScriptGravatar<T extends GravatarApi>(_options?: GravatarInput) {}
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

::script-types
::

## Example

Using the composable to get avatar URLs directly.

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
