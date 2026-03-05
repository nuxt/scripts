---

title: Plausible Analytics
description: Use Plausible Analytics in your Nuxt app.
links:
  - label: Source
    icon: i-simple-icons-github
    to: https://github.com/nuxt/scripts/blob/main/src/runtime/registry/plausible-analytics.ts
    size: xs

---

[Plausible Analytics](https://plausible.io/) is a privacy-friendly analytics solution for Nuxt Apps, allowing you to track your website's traffic without compromising your users' privacy.

::script-stats
::

::script-docs
::

### Self-hosted Plausible

If you are using a self-hosted version of Plausible, you will need to provide an explicit src for the script so that
the API events are sent to the correct endpoint.

```ts
useScriptPlausibleAnalytics({
  scriptInput: {
    src: 'https://my-self-hosted-plausible.io/js/script.js'
  }
})
```

::script-types
::

**Note:** The `scriptId` is found in your Plausible dashboard under **Site Installation** in your site settings.

**Extracting your Script ID:**

Plausible provides you with a script tag like this:

```html
<script async src="https://plausible.io/js/pa-gYyxvZhkMzdzXBAtSeSNz.js"></script>
```

Your `scriptId` is the part after `pa-` and before `.js`:

```ts
scriptId: 'gYyxvZhkMzdzXBAtSeSNz'
//         ^^^^^^^^^^^^^^^^^^^^^^^
//         Extract from: pa-{scriptId}.js
```
