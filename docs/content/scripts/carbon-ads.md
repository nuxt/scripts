---
title: Carbon Ads
description: Show carbon ads in your Nuxt app using a Vue component.
links:
  - label: "<ScriptCarbonAds>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/components/ScriptCarbonAds.vue
    size: xs
---

[Carbon Ads](https://www.carbonads.net/) serves ads through a standard embed script.

Use the headless [`<ScriptCarbonAds>`{lang="html"}](/scripts/carbon-ads){lang="html"} component to place one of its ads in a Nuxt page.

::script-stats
::

::script-docs
::

## [`<ScriptCarbonAds>`{lang="html"}](/scripts/carbon-ads){lang="html"}

Unlike other Nuxt Scripts components, `<ScriptCarbonAds>`{lang="html"} bypasses [`useScript()`{lang="ts"}](/docs/api/use-script){lang="ts"} and inserts the Carbon script into its own `div`.

It loads when mounted. Pass an [element event trigger](/docs/guides/script-triggers#element-event-triggers) if the ad should wait for a specific interaction.

Carbon's [placement policy](https://www.carbonads.net/placement-policy) requires the ad code to load only once per page and forbids modifying or self-hosting the script. Render one component for the active page. The component requests Carbon's CDN script directly, but it does not enforce the one-component limit.

```vue
<template>
  <ScriptCarbonAds
    serve="..."
    placement="..."
    format="..."
  />
</template>
```

### Handling ad blockers

Use the `error` slot when Carbon Ads is blocked:

```vue
<template>
  <ScriptCarbonAds
    serve="..."
    placement="..."
    format="..."
  >
    <template #error>
      <!-- Fallback ad -->
      Please support us by disabling your ad blocker.
    </template>
  </ScriptCarbonAds>
</template>
```

### Adding UI

The component has no inherited styles. This example uses the styles from nuxt.com:

```vue
<template>
  <ScriptCarbonAds
    class="Carbon border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-white/5"
    serve="..."
    placement="..."
    format="..."
  />
</template>

<style lang="postcss">
/* Credits to nuxt.com */
.dark .Carbon {
  min-height: 220px;
  .carbon-text {
    @apply text-gray-400;

    &:hover {
      @apply text-gray-200;
    }
  }
}

.light .Carbon {
  .carbon-text {
    @apply text-gray-600;

    &:hover {
      @apply text-gray-800;
    }
  }
}

.Carbon {
  @apply p-3 flex flex-col max-w-full;

  @screen sm {
    @apply max-w-xs;
  }

  @screen lg {
    @apply mt-0;
  }

  #carbonads span {
    @apply flex flex-col justify-between;

    .carbon-wrap {
      @apply flex flex-col;

      flex: 1;

      @media (min-width: 320px) {
        @apply flex-row;
      }

      @screen lg {
        @apply flex-col;
      }

      .carbon-img {
        @apply flex items-start justify-center mb-4;

        @media (min-width: 320px) {
          @apply mb-0;
        }

        @screen lg {
          @apply mb-4;
        }
      }

      .carbon-text {
        @apply flex-1 text-sm w-full m-0 text-left block;

        &:hover {
          @apply no-underline;
        }

        @media (min-width: 320px) {
          @apply ml-4;
        }

        @screen lg {
          @apply ml-0;
        }
      }
    }
  }

  img {
    @apply w-full;
  }

  & .carbon-poweredby {
    @apply ml-2 text-xs text-right text-gray-400 block pt-2;

    &:hover {
      @apply no-underline text-gray-500;
    }
  }
}
</style>
```


### Component API

See the [Facade Component API](/docs/guides/facade-components#facade-components-api) for full props, events, and slots.

The component's `ready` event receives the injected `HTMLScriptElement`.

::script-types
::
