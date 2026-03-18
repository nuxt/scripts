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

::script-stats
::

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

::script-types
::

#### Configuration Options

- `siteId` (required): Your Rybbit Analytics site ID
`autoTrackPageview`: Set to `false` to disable automatic tracking of the initial pageview when the script loads. You will need to manually call the pageview function to track pageviews. Default: `true`
- `trackSpa`: Set to `false` to disable automatic pageview tracking for single page applications
- `trackQuery`: Set to `false` to disable tracking of URL query strings
- `trackOutbound`: Set to `false` to disable automatic tracking of outbound link clicks. Default: `true`
- `trackErrors`: Set to `true` to enable automatic tracking of JavaScript errors and unhandled promise rejections. Only tracks errors from the same origin to avoid noise from third-party scripts. Default: `false`
- `sessionReplay`: Set to `true` to enable session replay recording. Captures user interactions, mouse movements, and DOM changes for debugging and user experience analysis. Default: `false`
- `webVitals`: Set to `true` to enable Web Vitals performance metrics collection (LCP, CLS, INP, FCP, TTFB). Nuxt disables Web Vitals by default to reduce script size and network requests. Default: `false`
- `skipPatterns`: Array of URL path patterns to ignore
- `maskPatterns`: Array of URL path patterns to mask for privacy
- `debounce`: Delay in milliseconds before tracking a pageview after URL changes
- `apiKey`: API key for tracking from localhost during development. Bypasses origin validation for self-hosted Rybbit Analytics instances
