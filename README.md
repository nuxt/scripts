# Nuxt Scripts and Assets

Work in progress for the development of the following modules
- Nuxt Assets - Improved loading options for assets (proxy, inline, etc)
- Nuxt Scripts - useScripts, useStyles composables
- Nuxt Third Parties - Simple optimized wrappers for third parties
- Nuxt Third Party Capital - Wrappers supported by [Third Party Capital](https://github.com/GoogleChromeLabs/third-party-capital)

## Nuxt Assets

Provides `useInlineAsset` and `useProxyAsset` composables to load various resources.

`useInlineAsset` loads the resource serverside and inlines the response as HTML rather than linking it. This saves any network overhead in fetching the script for the first time but it means it can't be cached by the browser for reloads (good for tiny scripts). It will add a tiny bit of latency to the initial SSR until the script is cached.

`useProxyAsset` loads the resource serverside as well but just acts as a proxy, this can be useful to remove the DNS lookup time of using an alternative domain. This has a caching layer so can potentially provide a faster, closer to the edge download for the end user depending on the sites infrastructure.

Default behavior: if there's an asset strategy then the request will be routed by the Nuxt server (or prerendered for SSG).

## Nuxt Scripts

Provides `useScript` and `useStyles` composables to load scripts and stylesheets.

`useScript` loads scripts with various options. It uses a trigger and asset strategy options to control how and when the script gets requested.
`useStyles` allows for optimized stylesheet loading out of the box.

See [useScript](https://unhead.unjs.io/usage/composables/use-script)

## Nuxt Third Parties

Third Party wrappers with Nuxt support.
In development:
- Cloudflare Analytics
- Cloudflare Turnstile
- Fathom Analytics
- Google Adsense
- Google Recaptcha

## Nuxt Third Party Capital

Third Party wrappers supported by Nuxt & Third Party Capital. Third Party Capital is a resource that consolidates best practices for loading popular third-parties in a single place.

Supported wrappers:
- Google Analytics
- Google Tag Manager
- Youtube Embed
- Google Maps JavaScript Api

See [Third Party Capital](https://github.com/GoogleChromeLabs/third-party-capital)

## Features

- 🌐 Serve scripts from your domain using triggers (`idle`, `manual`, `Promise`) and asset strategies (`inline`, `proxy`)

## Future Features (ideas welcome)

- 🔒 Lock down your site with Content Security Policy integration
- Load scripts from nuxt.config with `scripts.globals`
- ?? (ideas welcome)
