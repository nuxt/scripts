# Issue #131: Iframe Script Sandboxing - Research Summary

## Current Architecture

Scripts are loaded via `useScript()` (wrapping `@unhead/vue`'s `useScript`), which injects `<script>` tags directly into the main document. Registry scripts (GA, GTM, Clarity, Plausible, etc.) all follow the same pattern:

1. A `clientInit` function sets up globals on `window` (e.g., `window.dataLayer`, `window.gtag`, `window.clarity`)
2. The script `src` is loaded into the document
3. A `use()` function returns references to those window globals
4. Scripts communicate with the parent page by reading/writing shared window state

The module already has two isolation strategies:
- **First-party mode** (default: enabled) - Downloads scripts at build time, serves from your domain, proxies collection endpoints through Nitro server handlers. Rewrites URLs in script content so analytics beacons go through `/_proxy/*`.
- **Partytown mode** - Offloads scripts to a web worker via `type="text/partytown"`, with forwarded function calls.

## Feasibility Assessment: HARD

### How It Would Work

A Nitro server route (e.g., `/_scripts/sandbox/:scriptKey`) would serve a minimal HTML page containing the third-party script. The parent page loads this in a `<iframe sandbox="allow-scripts allow-same-origin">`. Communication happens via `postMessage`:

```
Parent page                    Sandboxed iframe
    |                               |
    |-- postMessage('gtag', args) ->|
    |                               |-- executes gtag(args)
    |                               |-- sends beacon to GA
```

### Which Scripts Would Benefit

**Good candidates (fire-and-forget analytics, no DOM access needed):**
- Google Analytics (`gtag`) - only sends beacons
- Plausible Analytics - only sends beacons
- Fathom Analytics - only sends beacons
- Umami Analytics - only sends beacons
- Cloudflare Web Analytics - only sends beacons
- Matomo Analytics - only sends beacons
- Segment - only sends data
- Meta Pixel, X Pixel, TikTok Pixel, Snapchat Pixel, Reddit Pixel - tracking pixels

**Bad candidates (require parent DOM access):**
- Google Tag Manager - injects scripts, reads DOM, manages consent UI
- Clarity - records DOM mutations, mouse movements, session replays
- Hotjar - session recording, heatmaps, surveys (DOM overlay)
- Crisp - chat widget (DOM overlay)
- Intercom - chat widget (DOM overlay)
- Google reCAPTCHA - DOM form integration
- Google Sign-In - DOM button rendering
- Google Maps - DOM rendering
- Stripe - DOM form integration
- PayPal - DOM button rendering
- YouTube/Vimeo Player - already use iframes natively

### Sandbox Permissions Required

- `allow-scripts` - required (script must execute)
- `allow-same-origin` - **required for `postMessage` to work with origin checking**, but this significantly weakens the sandbox. With `allow-scripts + allow-same-origin`, the iframe script can remove its own sandbox attribute and escape. This is a well-known limitation.
- Alternative: Use `allow-scripts` without `allow-same-origin` and do origin-less messaging (less secure message validation)

### Key Limitations

1. **Sandbox escape with `allow-same-origin`**: The combination of `allow-scripts` + `allow-same-origin` allows a compromised script to call `document.querySelector('iframe').removeAttribute('sandbox')` on itself and break out. To prevent this, you'd need to serve the iframe from a different origin (subdomain), which defeats the simplicity goal.

2. **Cookie/session loss**: Without `allow-same-origin`, the iframe has an opaque origin. Analytics scripts that rely on first-party cookies (GA4 uses `_ga` cookie) would lose session continuity. This breaks the core value proposition of most analytics tools.

3. **Proxy complexity**: Each sandboxed script needs a Nitro route to serve its HTML wrapper. The existing first-party proxy already rewrites URLs and serves scripts from your domain - adding an iframe layer on top adds complexity for marginal gain.

4. **API surface mismatch**: Registry scripts expose typed APIs (e.g., `gtag()`, `plausible()`) that users call directly. With iframe sandboxing, every API call becomes async `postMessage`. This breaks the current synchronous `use()` pattern and requires rewriting every registry script's interface. The existing `clientInit` pattern that sets up `window.dataLayer` etc. becomes meaningless.

5. **Duplicate work with first-party mode**: First-party mode already mitigates the main security concerns:
   - Script content is downloaded at build time and served from your domain (supply-chain protection)
   - Collection endpoints are proxied (privacy protection)
   - SRI integrity hashes can be enabled (`assets.integrity: true`)
   - A compromised CDN cannot inject different code because the script is bundled

6. **YouTube/Vimeo pattern is not reusable**: These components use iframes because that's how the vendor APIs work (YouTube's IFrame API, Vimeo's Player.js). They load a vendor-hosted iframe URL, not a sandbox wrapper. The script loaded in the parent (`youtube.com/iframe_api`) creates the iframe itself. This pattern doesn't generalize to analytics scripts.

### Does First-Party Mode Already Solve This?

**Mostly yes.** The primary threat model for #131 is: "a remote CDN script gets compromised." First-party mode addresses this by:

- Downloading scripts at build time (not loading from CDN at runtime)
- Serving from your domain (no third-party network requests from the browser)
- Enabling SRI integrity checking
- Proxying collection endpoints through your server

The remaining gap: if a script's legitimate code is itself malicious (not a CDN compromise, but the vendor is adversarial). Iframe sandboxing would help here, but only for the subset of scripts that don't need DOM access, and only if served from a different origin (which introduces deployment complexity).

## Recommendation: Not Worth Pursuing

**Reason:** The cost-benefit ratio is poor.

- First-party mode + SRI integrity already covers the main supply-chain attack vector
- Partytown already covers the "isolate from main thread" use case for analytics scripts
- True iframe sandboxing requires a separate origin to be effective, adding deployment complexity
- The API redesign needed (sync -> async postMessage) would break the DX of every registry script
- Only ~12 of ~30+ registry scripts could even be sandboxed (no DOM access needed)
- The `allow-scripts + allow-same-origin` combination makes same-origin sandboxing ineffective against a determined attacker

**Better investments for security:**
1. Expand first-party proxy support to more scripts (some still load directly)
2. Add CSP header generation based on configured scripts
3. Add script content diffing (alert when a bundled script changes between builds)
4. Improve Partytown integration as the worker-based isolation path
