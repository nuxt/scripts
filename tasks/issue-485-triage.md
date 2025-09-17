# Issue #485 Triage: Force Download Option for Scripts

## Summary
**Issue**: Add `forceDownload` option to force scripts to be downloaded at compile time even if they already exist in cache

**Status**: Enhancement request - moderate implementation complexity
**Priority**: Low-Medium (useful for development, less critical for production)
**Type**: Feature enhancement

## Problem Description

Users want the ability to force scripts to be re-downloaded during build time, even if they already exist in the cache. This is useful when:
- Scripts might have been updated at the source
- Development workflows need fresh scripts
- Debugging script-related issues
- Ensuring latest versions of third-party scripts

Requested API:
```typescript
scripts: {
  defaultScriptOptions: {
    bundle: true,
    forceDownload: true
  }
}
```

## Root Cause Analysis

### Current Caching Behavior
**File**: `src/plugins/transform.ts:69`

The bundling system has aggressive caching:
```typescript
// Current cache check - always returns cached version if exists
if (await storage.hasItem(`bundle:${filename}`)) {
  const res = await storage.getItemRaw<Buffer>(`bundle:${filename}`)
  // Returns cached version, never re-downloads
  return
}
```

### Cache Storage System
**File**: `src/assets.ts`

- **Storage Location**: `node_modules/.cache/nuxt/scripts`
- **Cache Keys**: `bundle:${filename}` format
- **Current Invalidation**: Only cleared in production builds, not in development

### Missing Feature
No mechanism exists to bypass cache for individual scripts or globally via configuration.

## Investigation Findings

### Key Files Involved
- `src/plugins/transform.ts` - Main bundling transform with cache logic
- `src/assets.ts` - Cache storage management
- `src/runtime/types.ts` - Type definitions
- `src/module.ts` - Module configuration and defaultScriptOptions

### Current Architecture
1. **Build-time Transform**: AST analysis finds scripts with `bundle: true`
2. **Cache Check**: Checks `bundleStorage()` for existing file
3. **Download Logic**: Only downloads if not in cache
4. **File Transformation**: Replaces URLs in source code

### Configuration Flow
```typescript
// nuxt.config.ts
scripts: { defaultScriptOptions: { bundle: true } }
     ↓
// module.ts - passes to transformer
defaultBundle: config.defaultScriptOptions?.bundle
     ↓
// transform.ts - uses in bundling logic
```

## Proposed Solution

### Implementation Strategy

#### 1. Type System Updates
**File**: `src/runtime/types.ts`

Add `forceDownload` to `NuxtUseScriptOptions`:
```typescript
/**
 * Force download scripts even if they exist in cache.
 * Useful for development or ensuring fresh scripts.
 * @default false
 */
forceDownload?: boolean
```

#### 2. Module Configuration Support
**File**: `src/module.ts`

Pass `forceDownload` option to transformer:
```typescript
addBuildPlugin(NuxtScriptBundleTransformer({
  // ... existing options
  forceDownload: config.defaultScriptOptions?.forceDownload,
}))
```

#### 3. Transform Plugin Updates
**File**: `src/plugins/transform.ts`

**A. Update transformer interface** (line 21):
```typescript
export interface AssetBundlerTransformerOptions {
  // ... existing options
  forceDownload?: boolean
}
```

**B. Modify cache check logic** (line 69):
```typescript
// Skip cache if forceDownload is true
if (!forceDownload && await storage.hasItem(`bundle:${filename}`)) {
  const res = await storage.getItemRaw<Buffer>(`bundle:${filename}`)
  // ... return cached version
  return
}
// Proceed with download...
```

**C. Pass option through download calls** (around line 257):
```typescript
const forceDownload = options.forceDownload || scriptForceDownload || false

await downloadScript({
  src,
  url,
  filename,
  forceDownload
}, renderedScript, options.fetchOptions)
```

#### 4. Support Both Global and Per-Script Configuration
```typescript
// Global configuration
scripts: {
  defaultScriptOptions: {
    bundle: true,
    forceDownload: true
  }
}

// Per-script override
useScript('https://example.com/script.js', {
  bundle: true,
  forceDownload: true
})
```

## Technical Implementation Strategy

### Phase 1: Core Implementation
1. **Update types**: Add `forceDownload` to `NuxtUseScriptOptions`
2. **Modify cache logic**: Bypass cache when `forceDownload` is true
3. **Update module config**: Pass option to transformer
4. **Test basic functionality**: Global and per-script configuration

### Phase 2: Enhanced Features
1. **Smart defaults**: Consider dev vs production behavior
2. **Performance warnings**: Warn about build time impact
3. **Selective download**: Fine-grained control over which scripts to force

### Phase 3: Documentation and Optimization
1. **Update documentation**: Add examples and use cases
2. **Performance guidelines**: Best practices for using forceDownload
3. **Integration tests**: Ensure cache behavior works correctly

## Complexity Assessment
- **Implementation**: Medium complexity (requires cache logic changes)
- **Type Safety**: Low complexity (straightforward type addition)
- **Configuration**: Low complexity (uses existing patterns)
- **Testing**: Medium complexity (need cache behavior tests)
- **Breaking Changes**: None (purely additive feature)

## Performance Implications

### Potential Impact
- **Build Time**: ⬆️ Increased due to re-downloading scripts
- **Network Usage**: ⬆️ Additional bandwidth consumption
- **Development Flow**: ⬇️ Slower builds with many scripts
- **CI/CD**: ⬇️ Longer deployment times if enabled

### Mitigation Strategies
1. **Default to false**: Maintain current performance by default
2. **Development recommendation**: Use primarily in development
3. **Selective application**: Only force download specific scripts
4. **Warning system**: Alert developers about performance impact

## Use Cases

### Primary Use Cases
1. **Development**: Fresh scripts during development workflow
2. **Debugging**: Eliminate cache as source of issues
3. **CI/CD**: Ensure latest versions in automated builds
4. **Script Updates**: When third-party scripts are updated

### Edge Cases
1. **Network Failures**: Handle download failures gracefully
2. **Large Scripts**: Performance impact with big script files
3. **Many Scripts**: Compound effect of multiple force downloads

## Risk Assessment
- **Risk Level**: Low-Medium
- **Breaking Changes**: None (optional feature)
- **Backward Compatibility**: 100% maintained
- **Performance Risk**: Manageable with proper defaults and warnings

## Recommendation

This is a valuable enhancement that addresses a real developer need. The implementation is straightforward and follows existing architectural patterns.

**Recommended approach**:
1. Start with basic implementation (Phase 1)
2. Default to `false` to maintain current performance
3. Add clear documentation about performance implications
4. Consider smart defaults (e.g., enable in dev mode only)

The feature would integrate cleanly with existing systems and provide developers with the control they need over script caching without affecting default behavior.