---
name: nuxt-test-utils-skilld
description: "ALWAYS use when writing code importing \"nuxt-test-utils\". Consult for debugging, best practices, or modifying nuxt-test-utils, nuxt test utils."
metadata:
  version: 0.0.1
  generated_by: Claude Code · Haiku 4.5
  generated_at: 2026-03-03
---

# richardeschloss/nuxt-test-utils `nuxt-test-utils`

**Version:** 0.0.1 (May 2020)
**Deps:** lodash.template@^4.5.0, serialize-javascript@^3.0.0
**Tags:** latest: 0.0.1 (May 2020)

**References:** [package.json](./.skilld/pkg/package.json) — exports, entry points • [README](./.skilld/pkg/README.md) — setup, basic usage • [GitHub Issues](./.skilld/issues/_INDEX.md) — bugs, workarounds, edge cases

## Search

Use `skilld search` instead of grepping `.skilld/` directories — hybrid semantic + keyword search across all indexed docs, issues, and releases. If `skilld` is unavailable, use `npx -y skilld search`.

```bash
skilld search "query" -p nuxt-test-utils
skilld search "issues:error handling" -p nuxt-test-utils
```

Filters: `docs:`, `issues:`, `releases:` prefix narrows by source type.

## API Changes

This section documents v0.0.1 as the initial release with foundational testing utilities for Nuxt modules and plugins.

- NEW: `getModuleOptions(config, moduleName, optsContainer)` — Module utility to extract module options from Nuxt config, searches buildModules/modules/optsContainer [source](./.skilld/pkg/README.md:L79:86)

- NEW: `ModuleContext({ options, module, compileOpts })` — Class providing test context for modules with `addTemplate()`, `addPlugin()`, `compilePlugin()`, and `registerModule()` methods [source](./.skilld/pkg/README.md:L87:97)

- NEW: `compilePlugin({ src, tmpFile, options, overwrite })` — Plugin compilation utility that processes ERB templates and replaces `<%= JSON.stringify(options) %>` placeholders [source](./.skilld/pkg/README.md:L100:107)

- NEW: `PluginContext(Plugin)` — Class constructor for testing plugins; intercepts `inject()` calls and stores injected items in `this.injected[label]` [source](./.skilld/pkg/README.md:L108:114)

- NEW: `delay(ms)` — Promisified `setTimeout` wrapper for cleaner async test code [source](./.skilld/pkg/README.md:L117)

- NEW: `nextTickP(ctx)` — Promise wrapper around `ctx.$nextTick()` for awaitable Vue tick handling [source](./.skilld/pkg/README.md:L118)

- NEW: `watchP(ctx, prop, changesFn)` — Promise wrapper around `ctx.$watch()` for awaiting data changes in tests [source](./.skilld/pkg/README.md:L119)

**Also changed:** Initial release (v0.0.1) with birth of nuxt-test-utils [source](./.skilld/pkg/CHANGELOG.md:L4:7)

## Best Practices

- Use selective imports for better tree-shaking and code clarity instead of importing the entire default export — only import the utilities you actually need in your test [source](./.skilld/pkg/README.md:L52:54)

- Pass `optsContainer` parameter to `getModuleOptions()` when your module config options are in a custom container — the function searches buildModules, modules, then optsContainer in that order [source](./.skilld/pkg/README.md:L80:85)

- Set `overwrite: false` (default) in `compilePlugin()` to cache compiled plugins across test runs — only use `overwrite: true` when testing plugin compilation changes [source](./.skilld/pkg/dist/pluginUtils.js:L10:12)

- In `watchP()`, the callback function executes AFTER the watch listener is set up, ensuring the state change is captured by the listener [source](./.skilld/pkg/dist/waitUtils.js:L13:17)

- Capture plugin injections in `PluginContext` by accessing `this.injected` after instantiation — this allows you to assert what the plugin injected [source](./.skilld/pkg/dist/pluginUtils.js:L26:32)

- Call `registerModule()` as the final step to execute the module with mocked context — this triggers all addPlugin/addTemplate calls [source](./.skilld/pkg/dist/moduleUtils.js:L18:20)

- Use ERB template syntax `<%= expression %>` in plugin files for option interpolation — the lodash template engine will replace these with compiled options [source](./.skilld/pkg/dist/pluginUtils.js:L18)

- Access `serialize-javascript` in plugin templates for complex object serialization beyond JSON.stringify — it's injected into the template context automatically [source](./.skilld/pkg/README.md:L31)

- Check `ctx.pluginAdded` and `ctx.templateAdded` properties after module execution — they contain the exact options passed to addPlugin/addTemplate calls [source](./.skilld/pkg/dist/moduleUtils.js:L6:16)

- Use `ModuleContext.compilePlugin()` directly when testing plugin compilation in isolation without a full module context [source](./.skilld/pkg/dist/moduleUtils.js:L17)
