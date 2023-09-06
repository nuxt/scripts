# Nuxt Scripts, Assets and Third Parties

Work in progress for the development of the following modules
- Nuxt Scripts - `useScript`, custom transformers, `ContentSecurityPolicy` 
- Nuxt Assets - Improved loading options for assets (proxy, inline, etc)
- Nuxt Third Parties - Simple optimised wrappers for third parties

# Nuxt Scripts

## useScript

Adds a globally unique script to the <head>.

### Load Strategy

- `idle` - Load the script when the browser is idle

### Asset Strategy

- `inline` - Inline the script
- `proxy` - Proxy the script

### Universal load / error events

- SSR won't trigger load events
- Hydration of SSR tags will trigger artificial load / error events
- CSR will trigger native load / error events


# Nuxt Third Parties

## Scripts

Support a number of third-party common scripts loaded in the best performance way while exposing 
a flexible and powerful wrapper on the underlying API.

- Build from `useScript`.

### Proxied API

- Function calls in unsupported environments (server side)
- Queued function calls for when the script has loaded (i.e send analytic events once a consent is agreed)
- Use functions when browser extensions may have blocked the library 
