---
title: NPM
description: Load IIFE scripts from NPM in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/npm.ts
    size: xs
---

::script-stats
::

::script-docs
::

## Background

You'd usually install an [npm](https://www.npmjs.com/) package and bundle it with your app. Loading it only when needed takes more work: you need a [dynamic `import()`{lang="ts"}](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import), a separate chunk, and any required transpilation during the build.

The [`useScriptNpm()`{lang="ts"}](/scripts/npm){lang="ts"} registry script abstracts this process, allowing you to load immediately invoked function expression (IIFE) builds with a single line of code.

Keep frequently used or critical packages in `package.json`. CDN loading is most useful for an occasional, non-critical IIFE.

The three examples below load the same file through the registry, `useScript`, and `useHead`.

::code-group

```ts [Registry Script useScriptNpm]
useScriptNpm({
  packageName: 'js-confetti',
  file: 'dist/js-confetti.browser.js',
  version: '0.12.0',
  provider: 'jsdelivr',
})
```

```ts [useScript]
useScript('https://cdn.jsdelivr.net/npm/js-confetti@0.12.0/dist/js-confetti.browser.js')
```

```ts [useHead]
useHead({
  script: [
    { src: 'https://cdn.jsdelivr.net/npm/js-confetti@0.12.0/dist/js-confetti.browser.js' }
  ]
})
```

::

## [`useScriptNpm()`{lang="ts"}](/scripts/npm){lang="ts"}

The [`useScriptNpm()`{lang="ts"}](/scripts/npm){lang="ts"} composable uses unpkg by default. Set `provider` to `'jsdelivr'` or `'cdnjs'` for the other supported URL formats.

```ts
function useScriptNpm<T extends Record<string | symbol, any>>(_options: NpmInput) {}
```

For triggers, proxying, and other script options, see [Registry Scripts](/docs/guides/registry-scripts).

### Map the loaded global

The generic type describes the proxy, but it does not discover a browser global. Map the loaded library explicitly with `scriptOptions.use`:

```ts
interface SomeApi {
  doSomething: () => void
}

const { proxy } = useScriptNpm<SomeApi>({
  packageName: 'some-api',
  scriptOptions: {
    use: () => (window as Window & { SomeApi: SomeApi }).SomeApi,
  },
})

proxy.doSomething()
```

Without `scriptOptions.use`, the IIFE still loads, but the composable does not expose its global API through `proxy` or `onLoaded`.

::script-types
::

## Example

See the [Tutorial: Load js-confetti](/docs/getting-started/confetti-tutorial) for further examples.
