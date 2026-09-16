### 📚 Description

If a page renders `{{ status }}` from a script with `trigger: 'client'`, hydration reports a mismatch. The server renders `awaitingLoad`, and the client renders `loading`. Registry scripts that fix their trigger to `client` hit this with no config: Vercel Analytics, Cloudflare Web Analytics, SpeedCurve, and npm-mode PostHog. #918's sweep found it on the `basic` and `speedcurve` fixtures (PC-20).

Unhead runs a `client` trigger synchronously inside `useScript()`, so `load()` sets `loading` during setup. The default `onNuxtReady` trigger, `visible`, `manual`, and `server` do not mismatch. They either change status after hydration or change it the same way on both sides.

The server now writes any status other than `awaitingLoad` to the payload. The client status ref reports that value until `app:suspense:resolve`, then shows the live status. The trigger and loader still run at the same moment. Only what templates and watchers read waits.

![Architecture: the server records the script status in the payload, and the client status ref reports it until hydration ends](.pr-lens/overview-dark-79873f920d4104d8768aa42c818b5533.svg)

I first computed the server status from the trigger instead of using the payload. That breaks when setup also calls `load()`. A status ref cannot tell those explicit calls apart from trigger loads, because Unhead calls the same `script.load`. The payload costs nothing unless a script loads on the server.

Load timing, measured on production builds, alternating before and after in headless Chromium. Values are medians in ms from navigation start, 20 runs (30 for `client` at 4x CPU):

| Page | CPU | `load()` called | `<script>` inserted | hydration ends |
|---|---|---|---|---|
| `default` | 1x | 27.9 → 28.4 | 28.7 → 29.2 | 21.9 → 22.1 |
| `onNuxtReady` | 1x | 28.0 → 28.0 | 28.7 → 28.8 | 21.6 → 21.7 |
| `client` | 1x | 20.6 → 20.9 | 27.8 → 27.9 | 22.0 → 21.8 |
| `default` | 4x | 104.0 → 106.2 | 107.2 → 109.3 | 77.8 → 80.4 |
| `onNuxtReady` | 4x | 104.8 → 106.4 | 107.6 → 109.1 | 80.6 → 78.1 |
| `client` | 4x | 77.9 → 76.9 | 105.9 → 102.5 | 85.0 → 80.3 |

With the fix, a `status` watcher on a client-trigger page sees `awaitingLoad > loading > loaded`. Before, it saw `loading > loaded`, because the ref was created after the status had already changed.

Loose ends:
- A component that hydrates lazily, such as `hydrate-on-visible`, hydrates after `app:suspense:resolve`. If it renders a client-trigger status, it still mismatches. I did not find a clean per-component signal for this.
- `basic` `/reload-trigger` (`#use-call-count` 0 vs 1) is a separate fixture quirk. Unhead calls `use()` eagerly on the client, and the page renders a counter that `use()` increments. I left it alone.
- The new e2e test calls `setup()` directly because #918 has not merged. Once #918 lands, convert it to `setupFixture()`.

> 🤖 AI disclosure: [Harlan Agent Kit](https://github.com/harlan-zw/harlan-agent-kit) modified this description. [My AI open-source policy](https://harlanzw.com/blog/ai-in-open-source).

<!----------------------------------------------------------------------
Before creating the pull request, please make sure you do the following:

- Check that there isn't already a PR that solves the problem the same way. If you find a duplicate,
  please help us by reviewing it.
- Read the contribution docs at https://nuxt.com/docs/community/contribution
- Ensure that PR title follows conventional commits (https://www.conventionalcommits.org)
- Update the corresponding documentation if needed.
- Include relevant tests that fail without this PR but pass with it.

If you used AI tools to help with this contribution, please ensure the PR description and
code reflect your own understanding.

Write in your own voice rather than copying AI-generated text.

Thank you for contributing to Nuxt!
----------------------------------------------------------------------->
