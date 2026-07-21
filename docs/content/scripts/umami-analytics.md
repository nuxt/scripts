---
title: Umami Analytics
description: Load Umami, identify sessions, and inspect or filter event payloads before they are sent.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/packages/script/src/runtime/registry/umami-analytics.ts
    size: xs
---

[Umami](https://umami.is/) is an open-source web analytics platform that can run in Umami Cloud or on your own server.

::script-stats
::

::script-docs
::

### Self-hosted Umami

If you use a self-hosted version of Umami, set `hostUrl` to your Umami origin. This maps to Umami's documented [`data-host-url`](https://docs.umami.is/docs/tracker-configuration#data-host-url) setting and tells the tracker where to send events.

```ts
useScriptUmamiAnalytics({
  websiteId: 'YOUR_WEBSITE_ID',
  hostUrl: 'https://my-self-hosted'
})
```

Use `scriptInput.src` only if you also need to override the script URL itself.

## Identify Sessions and Filter Data

### Identify a Session

Umami's [`identify`](https://docs.umami.is/docs/tracker-functions#sessions) function accepts either a distinct ID or an object with session data:

```ts
const { proxy } = useScriptUmamiAnalytics({
  websiteId: 'YOUR_WEBSITE_ID'
})

// Set a distinct ID
proxy.identify('user-12345')

// Attach data to the session
proxy.identify({
  userId: 'user-12345',
  plan: 'premium'
})
```

### Filter Data with `beforeSend`

Use [`beforeSend`](https://docs.umami.is/docs/tracker-configuration#data-before-send) to inspect, modify, or cancel a payload before Umami receives it:

```ts
useScriptUmamiAnalytics({
  websiteId: 'YOUR_WEBSITE_ID',
  beforeSend: (type, payload) => {
    // Log what's being sent while debugging
    console.log('Sending to Umami:', type, payload)

    // Filter out sensitive data
    if (payload.url && payload.url.includes('private')) {
      return false // Cancel send
    }

    // Modify payload before sending
    return {
      ...payload,
      referrer: '' // Remove referrer for privacy
    }
  }
})
```

You can also provide a string with the name of a globally defined function:

```ts
// Define function globally
window.myBeforeSendHandler = (type, payload) => {
  return checkPrivacyRules(payload) ? payload : false
}

useScriptUmamiAnalytics({
  websiteId: 'YOUR_WEBSITE_ID',
  beforeSend: 'myBeforeSendHandler'
})
```

::script-types
::
