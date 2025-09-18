---
title: NPM
description: Load IIFE scripts from NPM in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/npm.ts
    size: xs
---

## Background

When working with NPM files, you'd typically include them as a node_module dependency in the `package.json` file. However,
optimizing the script loading of these scripts can be difficult, requiring a dynamic import of the module from a separate chunk and
loading it only when needed. It also slows down your build as the module needs to be transpiled.

The `useScriptNpm` registry script abstracts this process, allowing you to load scripts that have been exported as immediately invokable functions,
with a single line of code .

In many instances it will still make more sense to include the script as a dependency in the `package.json` file, but for scripts that are not used often or
are not critical to the application, this can be a great alternative.

To begin with we can think of using this script as an alternative to the `useHead` composable. You can see an example of the abstraction
layers in the following code sample.

::code-group

```ts [Registry Script useScriptNpm]
useScriptNpm({
  packageName: 'js-confetti',
  file: 'dist/js-confetti.browser.js',
  version: '0.12.0',
})
```

```ts [useScript]
useScript('https://cdn.jsdelivr.net/npm/js-confetti@0.12.0/dist/js-confetti.browser.js')
```

```ts [useHead]
useHead({
  script: [
    { src: 'https://cdn.jsdelivr.net/npm/js-confetti@latest/dist/js-confetti.browser.js' }
  ]
})
```

::

## useScriptNpm

The `useScriptNpm` composable lets you have fine-grain control over when and how NPM scripts are loaded on your site.

```ts
function useScriptNpm<T extends Record<string | symbol, any>>(_options: NpmInput) {}
```

Please follow the [Registry Scripts](/docs/guides/registry-scripts) guide to learn more about advanced usage.

### NpmOptions

```ts
export const NpmOptions = object({
  packageName: string(),
  file: optional(string()),
  version: optional(string()),
  type: optional(string()),
})
```

### Return

To get types for the script you're loading, you'll need to augment the types of the `useScriptNpm` function.

```ts
interface SomeApi {
  doSomething: () => void
}
useScriptNpm<SomeApi>({
  packageName: 'some-api'
})
```

## Example

See the [Tutorial: Load js-confetti](/docs/getting-started/confetti-tutorial) for further examples.
