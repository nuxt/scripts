# Issue #482 Triage: Google Tag Manager - Source Option

## Summary
**Issue**: Add `source` option to Google Tag Manager for custom script URLs (server-side GTM)

**Status**: Enhancement request - straightforward feature addition
**Priority**: Medium (useful for enterprise/server-side GTM setups)
**Type**: Feature enhancement

## Problem Description

Users want to customize the GTM script URL for server-side implementations, similar to the `source` option available in zadigetvoltaire/nuxt-gtm. Currently, the GTM script URL is hardcoded to `https://www.googletagmanager.com/gtm.js`.

## Root Cause Analysis

### Current Implementation
**File**: `src/runtime/registry/google-tag-manager.ts:135`

The GTM script URL is hardcoded:
```typescript
src: withQuery('https://www.googletagmanager.com/gtm.js', {
  id: opts.id,
  l: opts.l,
  gtm_auth: opts.auth,
  // ... other parameters
})
```

### Missing Feature
**File**: `src/runtime/registry/google-tag-manager.ts:82-112`

The `GoogleTagManagerOptions` schema lacks a `source` option:
```typescript
export const GoogleTagManagerOptions = object({
  id: string(),
  l: optional(string()),
  auth: optional(string()),
  preview: optional(string()),
  cookiesWin: optional(union([boolean(), literal('x')])),
  debug: optional(union([boolean(), literal('x')])),
  npa: optional(union([boolean(), literal('1')])),
  dataLayer: optional(string()),
  envName: optional(string()),
  authReferrerPolicy: optional(string()),
  // MISSING: source option
})
```

## Investigation Findings

### Key Files Involved
- `src/runtime/registry/google-tag-manager.ts` - Main GTM implementation
- `docs/content/scripts/tracking/google-tag-manager.md` - Documentation

### Current Workaround
Users can manually specify the full URL:
```typescript
useScriptGoogleTagManager({
  scriptInput: {
    src: "https://www.mydomain.com/gtm.js?id=" + gtmId,
  },
});
```

**Problems with workaround**:
- Bypasses built-in query parameter handling
- Loses validation and type safety
- Requires manual URL construction

### Use Cases for Source Option
1. **Server-side GTM**: Custom GTM implementations hosted on own domain
2. **Proxy setups**: GTM proxied through own infrastructure
3. **Enterprise environments**: Custom GTM deployments
4. **Privacy compliance**: First-party GTM hosting

## Proposed Solution

### Implementation Requirements

#### 1. Schema Update
**File**: `src/runtime/registry/google-tag-manager.ts`

Add `source` option to `GoogleTagManagerOptions`:
```typescript
export const GoogleTagManagerOptions = object({
  /** GTM container ID (format: GTM-XXXXXX) */
  id: string(),

  /** The URL of the script; useful for server-side GTM */
  source: optional(string()),

  /** Optional dataLayer variable name */
  l: optional(string()),

  // ... existing options
})
```

#### 2. URL Construction Update
**File**: `src/runtime/registry/google-tag-manager.ts:135`

Update script URL logic:
```typescript
src: withQuery(opts.source || 'https://www.googletagmanager.com/gtm.js', {
  id: opts.id,
  l: opts.l,
  gtm_auth: opts.auth,
  // ... existing query parameters
})
```

#### 3. Documentation Update
**File**: `docs/content/scripts/tracking/google-tag-manager.md`

Add documentation for the new `source` option with examples.

#### 4. Type Definition Update
Update TypeScript definitions to include the new option.

## Technical Implementation Strategy

### Phase 1: Core Implementation
1. **Update schema**: Add `source` option to `GoogleTagManagerOptions`
2. **Update URL logic**: Use custom source when provided
3. **Add JSDoc**: Document the new option

### Phase 2: Documentation and Testing
1. **Update docs**: Add examples of server-side GTM usage
2. **Add tests**: Test custom source URLs
3. **Update playground**: Add example in documentation playground

## Complexity Assessment
- **Implementation**: Very low complexity (5-10 lines of code)
- **Testing**: Low complexity (standard URL parameter testing)
- **Documentation**: Low complexity (add new option to existing docs)
- **Breaking Changes**: None (purely additive)

## Benefits
1. **Feature Parity**: Matches functionality from zadigetvoltaire/nuxt-gtm
2. **Enterprise Support**: Enables server-side GTM setups
3. **Type Safety**: Maintains schema validation and TypeScript support
4. **Clean API**: Integrates seamlessly with existing GTM options

## Implementation Details

### Minimal Code Change
```typescript
// Schema addition (line ~85)
/** The URL of the script; useful for server-side GTM */
source: optional(string()),

// URL construction update (line 135)
src: withQuery(opts.source || 'https://www.googletagmanager.com/gtm.js', {
  // existing query parameters
})
```

### Example Usage
```typescript
useScriptGoogleTagManager({
  id: 'GTM-XXXXXX',
  source: 'https://my-custom-domain.com/gtm.js' // Custom GTM source
})
```

## Risk Assessment
- **Risk Level**: Very low
- **Breaking Changes**: None
- **Backward Compatibility**: 100% maintained
- **Testing Complexity**: Minimal

## Recommendation
This is a straightforward enhancement with high user value and very low implementation risk. The change is minimal, non-breaking, and provides important functionality for enterprise GTM deployments.