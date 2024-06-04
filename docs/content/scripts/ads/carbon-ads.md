---
title: Carbon Ads
description: Show carbon ads in your Nuxt app using a Vue component.
links:
  - label: "<ScriptCarbonAds>"
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/components/ScriptCarbonAds.vue
    size: xs
---

[Carbon Ads](https://www.carbonads.net/) is an ad service that provides a performance friendly way to show ads on your site.

Nuxt Scripts provides a headless `ScriptCarbonAds` component to embed Carbon Ads in your Nuxt app.

## ScriptCarbonAds

The `ScriptCarbonAds` component works differently to other Nuxt Scripts component and does not rely on `useScript`, instead it simply
inserts a script tag into the div of the component on mount.

By default, the component uses CarbonAds best practices which is to load immediately on mount. You can make use of [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers) if you
want to load the ads on a specific event.

```vue
<template>
  <ScriptGoogleAdsenseAd
    data-ad-client="..."
    data-ad-slot="..."
  />
</template>
```

### Handling Ad-blockers

You can use these hooks to add a fallback when CarbonAds is blocked.

```vue
<template>
  <ScriptCarbonAds
    serve="..."
    placement="..."
  >
    <template #error>
      <!-- Fallback ad -->
      Please support us by disabling your ad blocker.
    </template>
  </ScriptCarbonAds>
</template>
```

### Adding UI

The component renders as headless, meaning there is no inherit styles. If you'd like to customize the look of the ad, you can
use this example from nuxt.com.

```vue
<template>
  <ScriptCarbonAds
    class="Carbon border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-white/5"
    serve="..."
    placement="..."
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

### Props

The `ScriptCarbonAds` component accepts the following props:

- `serve`: The serve URL provided by Carbon Ads.
- `placement`: The placement ID provided by Carbon Ads.
- `trigger`: The trigger event to load the script. Default is `undefined`. See [Element Event Triggers](/docs/guides/script-triggers#element-event-triggers) for more information.

### Events

The component emits the script events.

```ts
const emits = defineEmits<{
  error: [e: string | Event]
  load: []
}>()
```

### Slots

There are a number of slots mapped to the script status that you can use to customize the ad experience.

- **error**:
  The slot is used to display content when the ad fails to load.

- **awaitingLoad**
  The slot is used to display content before the ad script is loaded.

- **loaded**
  The slot is used to display content after the ad script is loaded.

- **loading**
  The slot is used to display content while the ad script is loading.

```vue
<template>
  <ScriptCarbonAds
    serve="..."
    placement="..."
  >
    <template #awaitingLoad>
      Loading ads...
    </template>
  </ScriptCarbonAds>
</template>
```
