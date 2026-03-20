---
title: Umami Analytics
description: Use Umami Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/umami-analytics.ts
    size: xs
---

[Umami](https://umami.is/) collects all the metrics you care about to help you make better decisions.

::script-stats
::

::script-docs
::

### Self-hosted Umami

If you use a self-hosted version of Umami, provide an explicit src for the script so that the browser sends API events to the correct endpoint.

```ts
useScriptUmamiAnalytics({
  scriptInput: {
    src: 'https://my-self-hosted/script.js'
  }
})
```

::script-types
::

## Advanced Features

### Session Identification

Umami v2.18.0+ supports setting unique session IDs using the `identify` function. You can pass either a string (unique ID) or an object with session data:

```ts
const { proxy } = useScriptUmamiAnalytics({
  websiteId: 'YOUR_WEBSITE_ID'
})

// Using a unique string ID
proxy.identify('user-12345')

// Using session data object
proxy.identify({
  userId: 'user-12345',
  plan: 'premium'
})
```

### Data Filtering with beforeSend

The `beforeSend` option allows you to inspect, modify, or cancel data before it's sent to Umami. This is useful for implementing custom privacy controls or data filtering:

```ts
useScriptUmamiAnalytics({
  websiteId: 'YOUR_WEBSITE_ID',
  beforeSend: (type, payload) => {
    // Log what's being sent (for debugging)
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
