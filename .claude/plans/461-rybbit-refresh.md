# #461 - Rybbit custom events fail after refresh

## Issue
- **Repro**: https://stackblitz.com/edit/nuxt-starter-qiz8t4kg
- **Problem**: Default page tracking works, but custom events (button clicks) fail after page refresh
- **Behavior**:
  - Refresh page -> default track event fires correctly
  - Click button -> NO event sent
  - Navigate to another page -> click button -> events work again

## Diagnosis

State/timing issue on refresh vs SPA navigation:
- On refresh: script loads but proxy not ready for custom events
- On SPA nav: script already loaded, proxy works

**Root cause**: The original `use()` function returned `null` when `window.rybbit` was undefined, which broke the @unhead/vue proxy's ability to queue calls.

## Fix Applied

Added `clientInit` to create a queue-based stub (following GA/Plausible pattern):

```typescript
clientInit: import.meta.server
  ? undefined
  : () => {
      const w = window as any
      if (!w.rybbit) {
        const queue: any[] = []
        w.rybbit = {
          _q: queue,
          pageview: function () { queue.push(['pageview', ...arguments]) },
          event: function () { queue.push(['event', ...arguments]) },
          identify: function () { queue.push(['identify', ...arguments]) },
          clearUserId: function () { queue.push(['clearUserId', ...arguments]) },
          getUserId: () => null,
        }
      }
    },
```

## Progress

1. [x] Read Rybbit registry script
2. [x] Understand proxy initialization timing
3. [x] Compare state on refresh vs SPA navigation
4. [x] Fix initialization to ensure proxy ready for custom events on refresh
5. [x] All tests pass

## Final Implementation

The fix:
1. `clientInit` creates a stub with `_isStub` marker that queues calls to a closure-scoped array
2. `use()` calls `flushQueue()` on every invocation (called on script status changes)
3. `flushQueue()` detects real script (no `_isStub` marker) and replays queued calls

Key insight: The original code returned `null` from `use()` when `window.rybbit` was undefined, breaking the proxy. The fix ensures `use()` always returns an object and queued calls are flushed when the real script loads.

## Status: DONE

Needs manual testing with StackBlitz reproduction to confirm fix.
