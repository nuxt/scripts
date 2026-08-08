---
title: DeskCrew
description: Add a lazy-loaded DeskCrew support widget to your Nuxt app.
links:
  - label: useScriptDeskCrew
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/deskcrew.ts
    size: xs
  - label: "<ScriptDeskCrew>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/ScriptDeskCrew.vue
    size: xs
---

[DeskCrew](https://deskcrew.io/) is a support widget combining live chat, AI answers from your
knowledge base, a help centre and a changelog.

Use [`useScriptDeskCrew()`{lang="ts"}](#usescriptdeskcrew){lang="ts"} for direct SDK calls, or
[`<ScriptDeskCrew>`{lang="html"}](#scriptdeskcrew){lang="html"} for a custom chat launcher.

::script-stats
::

::script-docs
::

## [`<ScriptDeskCrew>`{lang="html"}](/scripts/deskcrew){lang="html"}

The headless facade holds back the DeskCrew widget until its
[element trigger](/docs/guides/script-triggers#element-event-triggers) fires. It listens for
`click` by default, so a visitor who never opens chat downloads none of the widget.

### Component API

See the [Facade Component API](/docs/guides/facade-components#facade-components-api) for full
props, events, and slots.

#### With environment variables

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  scripts: {
    registry: {
      deskcrew: { trigger: 'onNuxtReady' },
    }
  },
  runtimeConfig: {
    public: {
      scripts: {
        deskcrew: {
          widgetKey: '', // NUXT_PUBLIC_SCRIPTS_DESKCREW_WIDGET_KEY
          board: '', // NUXT_PUBLIC_SCRIPTS_DESKCREW_BOARD
        },
      },
    },
  },
})
```

```text [.env]
NUXT_PUBLIC_SCRIPTS_DESKCREW_WIDGET_KEY=<YOUR_PUBLIC_KEY>
NUXT_PUBLIC_SCRIPTS_DESKCREW_BOARD=<YOUR_BOARD_SLUG>
```

### Events

The component emits `ready` once the widget has mounted its launcher, and `error` if the script
fails to load.

### Slots

`awaitingLoad`, `loading`, `error` and the default slot behave as documented for facade
components.

## [`useScriptDeskCrew()`{lang="ts"}](/scripts/deskcrew){lang="ts"}

```ts
export function useScriptDeskCrew<T extends DeskCrewApi>(_options?: DeskCrewInput) {}
```

::script-types
::

### Identifying a visitor

Identity is a signed token minted by your own backend, so it is a runtime call rather than a
`nuxt.config` option. Everything in `nuxt.config` is a deploy-time constant, and baking one
visitor's token into a build would hand that identity to every other visitor.

```vue
<script setup lang="ts">
const { proxy } = useScriptDeskCrew({ widgetKey: 'pub_xxxxxxxx' })
const { data } = await useFetch('/api/deskcrew-token')
watchEffect(() => {
  if (data.value?.token)
    proxy.identify({ token: data.value.token })
})
</script>
```

### Other surfaces

`embed()`{lang="ts"}, `changelog()`{lang="ts"} and `surveys()`{lang="ts"} each mount a surface. Call each at most once per
page: a second call logs a warning and does nothing.

::callout
DeskCrew serves its widget from its own origin and derives its API endpoint from the script's
`src`, so this script does not support [bundling](/docs/guides/bundling) or
[first-party mode](/docs/guides/first-party). It loads directly from `deskcrew.io`.
::
