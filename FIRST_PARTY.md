# First-Party Mode — Architecture Reference

## Architecture

Two distinct mechanisms for first-party routing:

### Path A: Bundle + Rewrite + Intercept (most scripts)
1. **Build**: Downloads script, rewrites hardcoded URLs via AST using domain-to-proxy mappings derived from `proxy-configs.ts` `domains[]`, applies SDK-specific `postProcess` patches
2. **Client**: Intercept plugin wraps `fetch`/`sendBeacon`/`XHR`/`Image.src` via `__nuxtScripts` — any non-same-origin URL is automatically proxied through `/_scripts/p/<host><path>`
3. **Server**: Nitro handler at `/_scripts/p/**` extracts the domain from the path, reconstructs the upstream URL, and proxies with privacy transforms

### Path B: Config Injection + Proxy (PostHog only)
1. **Build**: `autoInject` on the PostHog proxy config sets `apiHost` → `/_scripts/p/us.i.posthog.com`
2. **Client**: SDK natively uses the injected endpoint — no interception needed
3. **Server**: Same Nitro proxy handler

PostHog is the only true Path B script — it uses npm mode (`src: false`, no script to download/rewrite).

### How runtime interception works
The AST rewriter transforms API calls in downloaded third-party scripts:
- `fetch(url)` → `__nuxtScripts.fetch(url)`
- `navigator.sendBeacon(url)` → `__nuxtScripts.sendBeacon(url)`
- `new XMLHttpRequest` → `new __nuxtScripts.XMLHttpRequest`
- `new Image` → `new __nuxtScripts.Image`

The intercept plugin defines `__nuxtScripts` with a simple `proxyUrl` function:
```js
function proxyUrl(url) {
  const parsed = new URL(url, location.origin)
  if (parsed.origin !== location.origin)
    return `${location.origin + proxyPrefix}/${parsed.host}${parsed.pathname}${parsed.search}`
  return url
}
```

No domain allowlist or rule matching needed. Only AST-rewritten third-party scripts call `__nuxtScripts`, so any non-same-origin URL is safe to proxy.

The server handler extracts the domain from the path (e.g. `/_scripts/p/www.google-analytics.com/g/collect` → `https://www.google-analytics.com/g/collect`) and looks up per-domain privacy config.

### Auto-inject (complementary to Path A)
Some Path A scripts also define `autoInject` on their proxy config to set SDK endpoint config:
- **Plausible**: `endpoint` → `/_scripts/p/plausible.io/api/event`
- **Umami**: `hostUrl` → `/_scripts/p/cloud.umami.is`
- **Rybbit**: `analyticsHost` → `/_scripts/p/app.rybbit.io/api`
- **Databuddy**: `apiUrl` → `/_scripts/p/basket.databuddy.cc`

Auto-inject respects per-script `proxy: false` opt-out (see "Per-script opt-out" below).

### SDK-specific post-processing (`postProcess` on ProxyConfig)
Some SDKs have quirks that require targeted regex patches after AST rewriting. These are defined as `postProcess` functions directly on each script's `ProxyConfig`:
- **Rybbit**: SDK derives API host from `document.currentScript.src.split("/script.js")[0]` — breaks when bundled to `/_scripts/assets/<hash>.js`. Regex replaces the split expression with the proxy path.
- **Fathom**: SDK checks `src.indexOf("cdn.usefathom.com") < 0` to detect self-hosted mode and overrides the tracker URL. Regex neutralizes this check.

Note: Google Analytics previously needed `postProcess` regex patches for dynamically constructed collect URLs. This is no longer needed since the runtime intercept plugin catches all non-same-origin URLs at the `sendBeacon`/`fetch` call site.

## Key mapping

Proxy config keys match registry keys directly — no indirection layer. A script's `registryKey` is used to look up its proxy config from `proxy-configs.ts`.

The only exception is `googleAdsense` which sets `proxy: 'googleAnalytics'` to share GA's proxy config.

## Per-script opt-out

Scripts can opt out of first-party mode at three levels:

### Registry level (no `proxy` capability)
Scripts without the `proxy` capability in `registry.ts` are never proxied. Used for scripts that require fingerprinting for core functionality:
- **Stripe**, **PayPal**: Fraud detection requires real client IP and browser fingerprints
- **Google reCAPTCHA**: Bot detection requires real fingerprints
- **Google Sign-In**: Auth integrity requires direct connection

These scripts also have `scriptBundling: false` to prevent AST rewriting.

### Config level (`proxy: false` in registry config)
Users can opt out per-script in `nuxt.config.ts`:

```
scripts.registry.plausibleAnalytics = { domain: 'mysite.com', proxy: false }
```

Or in tuple form with scriptOptions:
```
scripts.registry.plausibleAnalytics = [{ domain: 'mysite.com' }, { proxy: false }]
```

This skips domain registration, auto-inject, and AST rewriting for that script. Important for scripts with `autoInject` (Plausible, PostHog, Umami, Rybbit, Databuddy) since `autoInject` runs at module setup before transforms.

### Composable level (`scriptOptions: { proxy: false }`)
```ts
useScriptPlausibleAnalytics({
  scriptOptions: { proxy: false }
})
```

This only affects AST rewriting (the transform plugin skips proxy rewrites for the bundled script). It does **not** undo `autoInject` config changes, since those run at module setup before transforms. For scripts with `autoInject`, use the config-level opt-out instead.

## Adding a new script

1. Add a `domains[]` entry in `proxy-configs.ts` with the script's domains and a privacy preset
2. Add a registry entry in `registry.ts` with a matching `registryKey`
3. Done — the transform plugin derives rewrite rules from domains as `{ from: domain, to: proxyPrefix/domain }`

For npm-mode scripts (no download), define `autoInject` to configure the SDK's endpoint field.

For scripts that need fingerprinting (payments, CAPTCHA, auth), omit the `proxy` capability and set `scriptBundling: false` in the registry entry.

## Privacy presets

Four presets in `proxy-configs.ts` cover all scripts:

| Preset | Flags | Used by |
|---|---|---|
| `PRIVACY_NONE` | all false | GTM, PostHog, Plausible, Umami, Rybbit, Databuddy, Fathom, CF Web Analytics, Vercel, Segment, Carbon Ads, Lemon Squeezy, Matomo |
| `PRIVACY_FULL` | all true | Meta, TikTok, X, Snap, Reddit |
| `PRIVACY_HEATMAP` | ip, language, hardware | GA, Clarity, Hotjar |
| `PRIVACY_IP_ONLY` | ip only | Intercom, Crisp, Gravatar, YouTube, Vimeo |

## Script Support

| Config Key | Registry Scripts | Privacy | Mechanism |
|---|---|---|---|
| `googleAnalytics` | googleAnalytics, **googleAdsense** | `PRIVACY_HEATMAP` | Path A |
| `googleTagManager` | googleTagManager | `PRIVACY_NONE` | Path A |
| `metaPixel` | metaPixel | `PRIVACY_FULL` | Path A |
| `tiktokPixel` | tiktokPixel | `PRIVACY_FULL` | Path A |
| `xPixel` | xPixel | `PRIVACY_FULL` | Path A |
| `snapchatPixel` | snapchatPixel | `PRIVACY_FULL` | Path A |
| `redditPixel` | redditPixel | `PRIVACY_FULL` | Path A |
| `carbonAds` | carbonAds | `PRIVACY_NONE` | Path A |
| `lemonSqueezy` | lemonSqueezy | `PRIVACY_NONE` | Path A |
| `matomoAnalytics` | matomoAnalytics | `PRIVACY_NONE` | Path A |
| `youtubePlayer` | youtubePlayer | `PRIVACY_IP_ONLY` | Path A |
| `vimeoPlayer` | vimeoPlayer | `PRIVACY_IP_ONLY` | Path A |
| `segment` | segment | `PRIVACY_NONE` | Path A |
| `clarity` | clarity | `PRIVACY_HEATMAP` | Path A |
| `hotjar` | hotjar | `PRIVACY_HEATMAP` | Path A |
| `posthog` | posthog | `PRIVACY_NONE` | **Path B** (npm-only) + autoInject |
| `plausibleAnalytics` | plausibleAnalytics | `PRIVACY_NONE` | Path A + autoInject |
| `umamiAnalytics` | umamiAnalytics | `PRIVACY_NONE` | Path A + autoInject |
| `rybbitAnalytics` | rybbitAnalytics | `PRIVACY_NONE` | Path A + autoInject + postProcess |
| `databuddyAnalytics` | databuddyAnalytics | `PRIVACY_NONE` | Path A + autoInject |
| `fathomAnalytics` | fathomAnalytics | `PRIVACY_NONE` | Path A + postProcess |
| `cloudflareWebAnalytics` | cloudflareWebAnalytics | `PRIVACY_NONE` | Path A |
| `vercelAnalytics` | vercelAnalytics | `PRIVACY_NONE` | Path A |
| `intercom` | intercom | `PRIVACY_IP_ONLY` | Path A |
| `crisp` | crisp | `PRIVACY_IP_ONLY` | Path A |
| `gravatar` | gravatar | `PRIVACY_IP_ONLY` | Path A |

### Excluded from first-party mode (`proxy: false`)

| Script | Reason |
|---|---|
| `stripe` | Fraud detection requires real fingerprints |
| `paypal` | Fraud detection requires real fingerprints |
| `googleRecaptcha` | Bot detection requires real fingerprints |
| `googleSignIn` | Auth integrity requires direct connection |

## Design Notes

### Domain-based proxy routing
Each proxy config declares `domains[]` — the list of third-party domains that script communicates with. The transform plugin derives rewrite rules at build time as `{ from: domain, to: proxyPrefix/domain }`. The server handler extracts the domain from the proxy path and forwards to the upstream.

### Runtime intercept: no rules needed
The intercept plugin proxies any non-same-origin URL. No domain allowlist or rule matching is required because `__nuxtScripts` wrappers are only injected into AST-rewritten third-party scripts. Regular app code uses native `fetch`/`sendBeacon` and is unaffected.

The server handler extracts the target domain directly from the proxy path (`/_scripts/p/<host>/<path>`) and looks up privacy config by domain. Unrecognized domains default to full anonymization (fail-closed).

### Two-phase setup, configs built once
`module.ts` calls two functions:
1. `setupFirstParty(config, resolvePath)` — registers the proxy handler unconditionally (handler rejects unknown domains at runtime). Returns `FirstPartyConfig`.
2. In `modules:done`: resolves capabilities for each configured script via `resolveCapabilities()`, then calls `finalizeFirstParty({...})` which builds proxy configs from the registry, collects domain privacy mappings, applies auto-injects, registers the intercept plugin, and populates runtimeConfig. Respects per-entry `proxy: false` opt-out.

The transform plugin receives the pre-built `proxyConfigs` map via options — direct lookup per-script, no rebuilding.

Registry entry normalization (`true`/`'mock'`/object/array → `[input, scriptOptions?]` tuple) is handled once at module setup by `normalizeRegistryConfig()` (`src/normalize.ts`). All downstream consumers (env defaults, template plugin, auto-inject, partytown) receive a single shape.

### No mutable closure pattern
The intercept plugin is registered with a static `proxyPrefix` string — no mutable array captured by reference. Plugin generation is a pure function of its inputs.

### `firstParty: true` default
Default is `true`. For `nuxt generate` and static presets, a warning fires with actionable guidance.

### Privacy defaults
GA defaults (`PRIVACY_HEATMAP`): anonymizes ip/language/hardware, passes through userAgent/screen/timezone. UA string is needed for Browser/OS/Device reports; `hardware` flag covers cross-site fingerprinting vectors (canvas/WebGL/plugins/fonts/high-entropy client hints) that GA doesn't need for standard reports.

`hardware: true` also strips high-entropy Client Hints (`sec-ch-ua-arch`, `sec-ch-ua-model`) which GA4 is migrating toward for device reporting.

### Key files
- `src/normalize.ts` — normalizes registry config entries to `[input, scriptOptions?]` tuple form
- `src/first-party/proxy-configs.ts` — all proxy configs with `domains[]` + privacy presets
- `src/first-party/setup.ts` — orchestration (`setupFirstParty`, `finalizeFirstParty`, `applyAutoInject`)
- `src/first-party/intercept-plugin.ts` — client-side `__nuxtScripts` wrapper (proxyUrl for non-same-origin URLs)
- `src/first-party/types.ts` — FirstPartyOptions, ProxyConfig, ProxyAutoInject
- `src/registry.ts` — script metadata (labels, imports, bundling, `proxy: false` opt-out); `registryKey` = proxy config lookup key
- `src/registry-logos.ts` — SVG logos extracted from registry for smaller diffs
- `src/runtime/server/proxy-handler.ts` — server-side proxy with domain extraction + privacy transforms
- `src/runtime/server/utils/privacy.ts` — privacy resolution, IP anonymization, UA normalization, payload stripping
- `src/plugins/rewrite-ast.ts` — AST URL rewriting + canvas fingerprinting neutralization (generic); SDK-specific patches in `postProcess`
- `src/plugins/transform.ts` — build-time script download + URL rewriting, passes `postProcess` through
- `src/module.ts` — ModuleOptions, defaults
- `docs/content/docs/1.guides/2.first-party.md` — main docs page

### Config options
- `firstParty: true | false | { proxyPrefix?, privacy? }` — module-level option
- `proxyPrefix` — proxy endpoint path prefix (default: `/_scripts/p`)
- `assets.prefix` — bundled script asset path (default: `/_scripts/assets`)
- Per-script `firstParty: false` — in registry config input or scriptOptions to opt out individual scripts
- Per-script `proxy: false` — in registry.ts for scripts that must never be proxied (fingerprinting requirements)
