# Scripts Module

> 3rd party script manager for Nuxt

Goals:
- 3rd party script presets
- Debugging
- Utilities for integration with routing system (analytics/page-tracking)
- emitting events + stack picked up by lazy-loaded script
- All injections on runtime but directly to the head by default
- cookie handling - permissions (e.g. only load script if condition is met) - e.g. GDPR, DNT
- performance optimisation strategies, like onNuxtReady, partytown, etc.
- Server-side handling (collect events and report on client?)

Provider (e.g. GTM)
- [conditions for injecting]
- [events emitted]
  emitEvent('gtm', payload)
   - implementation: emitEvent = (eventName, payload) => {
     window.dataLayer.push({
       event: eventName,
       ...payload
     })
   }
- [script injected]

## Development

- Run `npm run dev:prepare` to generate type stubs.
- Use `npm run dev` to start [playground](./playground) in development mode.
