---
name: oxc-walker-skilld
description: "ALWAYS use when writing code importing \"oxc-walker\". Consult for debugging, best practices, or modifying oxc-walker, oxc walker."
metadata:
  version: 0.7.0
  generated_by: Claude Code · Haiku 4.5
  generated_at: 2026-02-24
---

# oxc-project/oxc-walker `oxc-walker`

**Version:** 0.7.0 (Jan 2026)
**Deps:** magic-regexp@^0.10.0
**Tags:** latest: 0.7.0 (Jan 2026)

**References:** [package.json](./.skilld/pkg/package.json) — exports, entry points • [README](./.skilld/pkg/README.md) — setup, basic usage • [GitHub Issues](./.skilld/issues/_INDEX.md) — bugs, workarounds, edge cases • [Releases](./.skilld/releases/_INDEX.md) — changelog, breaking changes, new APIs

## Search

Use `skilld search` instead of grepping `.skilld/` directories — hybrid semantic + keyword search across all indexed docs, issues, and releases. If `skilld` is unavailable, use `npx -y skilld search`.

```bash
skilld search "query" -p oxc-walker
skilld search "issues:error handling" -p oxc-walker
skilld search "releases:deprecated" -p oxc-walker
```

Filters: `docs:`, `issues:`, `releases:` prefix narrows by source type.

## API Changes

This section documents version-specific API changes -- prioritize recent major/minor releases.

- NEW: `ScopeTrackerVariable` -- exported class in v0.7.0, enables `instanceof` checks on results from `scopeTracker.getDeclaration()`. Previously internal-only; LLMs will not know these classes are importable [source](./.skilld/releases/v0.7.0.md#features)

- NEW: `ScopeTrackerFunction` -- exported class in v0.7.0, represents function declarations tracked by `ScopeTracker`. Import directly from `oxc-walker` for type narrowing [source](./.skilld/releases/v0.7.0.md#features)

- NEW: `ScopeTrackerImport` -- exported class in v0.7.0, represents import declarations tracked by `ScopeTracker`. Has `.importNode` property for accessing the full `ImportDeclaration` [source](./.skilld/releases/v0.7.0.md#features)

- NEW: `ScopeTrackerFunctionParam` -- exported class in v0.7.0, represents function parameters tracked by `ScopeTracker`. Has `.fnNode` for accessing the parent function node [source](./.skilld/releases/v0.7.0.md#features)

- NEW: `ScopeTrackerIdentifier` -- exported class in v0.7.0, represents plain identifiers (e.g. class/enum names) tracked by `ScopeTracker` [source](./.skilld/releases/v0.7.0.md#features)

- NEW: `ScopeTrackerCatchParam` -- exported class in v0.7.0, represents catch clause parameters tracked by `ScopeTracker`. Has `.catchNode` for the parent `CatchClause` [source](./.skilld/releases/v0.7.0.md#features)

- NEW: `getUndeclaredIdentifiersInFunction(node)` -- exported in v0.7.0, returns `string[]` of identifier names referenced but not declared within a `Function` or `ArrowFunctionExpression` node [source](./.skilld/releases/v0.7.0.md#features)

- NEW: `isBindingIdentifier(node, parent)` -- exported in v0.7.0, returns `boolean` indicating whether a node is a binding identifier given its parent context [source](./.skilld/releases/v0.7.0.md#features)

- DEPRECATED: `ScopeTrackerFunctionParam.start` -- use `.fnNode.start` instead. The representation of this position may change in future versions [source](./.skilld/pkg/dist/index.d.ts:L279)

- DEPRECATED: `ScopeTrackerFunctionParam.end` -- use `.fnNode.end` instead. The representation of this position may change in future versions [source](./.skilld/pkg/dist/index.d.ts:L283)

- NEW: `ScopeTrackerNode` type -- union type exported in v0.7.0: `ScopeTrackerFunctionParam | ScopeTrackerFunction | ScopeTrackerVariable | ScopeTrackerIdentifier | ScopeTrackerImport | ScopeTrackerCatchParam`. Use for typing `getDeclaration()` results [source](./.skilld/releases/v0.7.0.md#features)

- BREAKING: `oxc-parser` peer dependency -- v0.6.0 requires `oxc-parser` v0.98.0+. Older oxc-parser versions are no longer compatible [source](./.skilld/releases/v0.6.0.md#features)

**Also changed:** `WalkOptions` type exported v0.7.0 · `WalkerEnter` type exported v0.7.0 · `WalkerLeave` type exported v0.7.0 · `WalkerCallbackContext` type exported v0.7.0 · `WalkerThisContextEnter` type exported v0.7.0 · `WalkerThisContextLeave` type exported v0.7.0 · `Identifier` type exported v0.7.0 · `ScopeTrackerOptions` type exported v0.7.0

## Best Practices

- Use regular function expressions (not arrow functions) for `enter`/`leave` callbacks -- `this.skip()`, `this.replace()`, and `this.remove()` are bound via `this` context and won't work with arrow functions [source](./.skilld/pkg/dist/index.d.ts:L88:90)

```ts
// correct
walk(ast, { enter(node) { this.skip() } })
// broken -- this.skip is undefined
walk(ast, { enter: (node) => { this.skip() } })
```

- Use `parseAndWalk` over separate `parseSync` + `walk` when you only need a single pass -- it returns `ParseResult` (including `program`) so you can still re-walk the AST if needed later [source](./.skilld/pkg/README.md#parse-and-walk-directly)

- For hoisted declaration resolution, use the two-pass pattern: create `ScopeTracker({ preserveExitedScopes: true })`, run `parseAndWalk` as a pre-pass to collect all declarations, call `scopeTracker.freeze()`, then `walk(program, { scopeTracker })` for analysis -- without this, `getDeclaration()` returns `null` for identifiers declared after their usage in source order [source](./.skilld/pkg/README.md:L170:203)

- Do not use `this.replace()` or `this.remove()` when a `ScopeTracker` is attached -- the scope tracker will not update its internal declarations, leaving stale scope data [source](./.skilld/pkg/README.md#thisreplacenewnode)

- `this.remove()` takes precedence over `this.replace()` -- if both are called in the same callback, the node is removed regardless of replacement [source](./.skilld/pkg/README.md#thisremove)

- `this.skip()` is only available in `enter`, not `leave`, and skipping a node also prevents its `leave()` callback from firing -- this means ScopeTracker state can become inconsistent if you skip nodes that create scopes [source](./.skilld/issues/issue-106.md)

- Type-narrow `ScopeTrackerNode` using the `.type` discriminant or `instanceof` (v0.7.0+) to access parent declaration nodes -- `ScopeTrackerVariable` exposes `.variableNode`, `ScopeTrackerImport` exposes `.importNode`, `ScopeTrackerCatchParam` exposes `.catchNode`, `ScopeTrackerFunctionParam` exposes `.fnNode` [source](./.skilld/pkg/dist/index.d.ts:L268:311)

- `isCurrentScopeUnder(scope)` uses strict child checking -- it returns `false` when the current scope equals the given scope, only `true` for descendants [source](./.skilld/pkg/dist/index.d.ts:L226:236)

- Use `getUndeclaredIdentifiersInFunction(node)` to find free variables (closures) in a function or arrow function expression -- useful for tree-shaking analysis and determining if a function can be safely hoisted or moved [source](./.skilld/pkg/dist/index.d.ts:L246)

- `ScopeTrackerFunctionParam.start` and `.end` are deprecated -- access the function's position via `.fnNode.start` and `.fnNode.end` instead [source](./.skilld/pkg/dist/index.d.ts:L277:285)
