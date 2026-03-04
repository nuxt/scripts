---

title: Rybbit Analytics
description: Use Rybbit Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/rybbit.ts
    size: xs

---

[Rybbit Analytics](https://www.rybbit.io/) is a privacy-focused analytics solution for tracking user activity on your website without compromising your users' privacy.

::script-docs
::

### Self-hosted Rybbit Analytics

If you are using a self-hosted version of Rybbit Analytics, you can provide a custom script source:

```ts
useScriptRybbitAnalytics({
  scriptInput: {
    src: 'https://your-rybbit-instance.com/api/script.js'
  },
  siteId: 'YOUR_SITE_ID'
})
```

### RybbitAnalyticsApi

```ts
export interface RybbitAnalyticsApi {
  /**
   * Tracks a page view
   */
  pageview: () => void

  /**
   * Tracks a custom event
   * @param name Name of the event
   * @param properties Optional properties for the event
   */
  event: (name: string, properties?: Record<string, any>) => void

  /**
   * Sets a custom user ID for tracking logged-in users
   * @param userId The user ID to set (will be stored in localStorage)
   */
  identify: (userId: string) => void

  /**
   * Clears the stored user ID
   */
  clearUserId: () => void

  /**
   * Gets the currently set user ID
   * @returns The current user ID or null if not set
   */
  getUserId: () => string | null
  /**
   * @deprecated use top level functions instead
   */
  rybbit: RybbitAnalyticsApi
}
```

### Config Schema

You must provide the options when setting up the script for the first time.

```ts
export const RybbitAnalyticsOptions = object({
  siteId: union([string(), number()]), // required
  autoTrackPageview: optional(boolean()),
  trackSpa: optional(boolean()),
  trackQuery: optional(boolean()),
  trackOutbound: optional(boolean()),
  trackErrors: optional(boolean()),
  sessionReplay: optional(boolean()),
  webVitals: optional(boolean()),
  skipPatterns: optional(array(string())),
  maskPatterns: optional(array(string())),
  debounce: optional(number()),
  apiKey: optional(string()),
})
```

#### Configuration Options

- `siteId` (required): Your Rybbit Analytics site ID
`autoTrackPageview`: Set to `false` to disable automatic tracking of the initial pageview when the script loads. You will need to manually call the pageview function to track pageviews. Default: `true`
- `trackSpa`: Set to `false` to disable automatic pageview tracking for single page applications
- `trackQuery`: Set to `false` to disable tracking of URL query strings
- `trackOutbound`: Set to `false` to disable automatic tracking of outbound link clicks. Default: `true`
- `trackErrors`: Set to `true` to enable automatic tracking of JavaScript errors and unhandled promise rejections. Only tracks errors from the same origin to avoid noise from third-party scripts. Default: `false`
- `sessionReplay`: Set to `true` to enable session replay recording. Captures user interactions, mouse movements, and DOM changes for debugging and user experience analysis. Default: `false`
- `webVitals`: Set to `true` to enable Web Vitals performance metrics collection (LCP, CLS, INP, FCP, TTFB). Web Vitals are disabled by default to reduce script size and network requests. Default: `false`
- `skipPatterns`: Array of URL path patterns to ignore
- `maskPatterns`: Array of URL path patterns to mask for privacy
- `debounce`: Delay in milliseconds before tracking a pageview after URL changes
- `apiKey`: API key for tracking from localhost during development. Bypasses origin validation for self-hosted Rybbit Analytics instances
