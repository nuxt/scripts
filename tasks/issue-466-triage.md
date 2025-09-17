# Issue #466 Triage: Bundle Auto-Injection and Documentation

## Summary
**Issue**: `bundle: true` does not automatically inject bundled script nor update src, and this is undocumented

**Status**: Bug with documentation gap
**Priority**: Medium-High (affects user expectations and UX)
**Type**: Feature enhancement + documentation improvement

## Problem Description

Users expect that setting `bundle: true` will either:
1. Automatically replace the script src with the bundled version at runtime, OR
2. Automatically inject the bundled script into the DOM

Current behavior only does build-time URL transformation in source code, which leaves users confused about how to access the bundled script.

## Root Cause Analysis

### How Bundling Currently Works
- **Build-time only**: The transform plugin (`src/plugins/transform.ts`) replaces URLs during build
- **Static analysis**: Only works with literal string URLs (no dynamic/computed URLs)
- **AST transformation**: Replaces `src` in source code and removes `bundle: true` option
- **No runtime API**: Users cannot access the transformed src URL at runtime

### What Users Actually Get vs Expect

**Current behavior:**
```typescript
// Source code:
useScript('https://example.com/script.js', { bundle: true })

// Gets transformed to:
useScript('/_scripts/[hash].js', {})

// But runtime script instance doesn't expose the new src
```

**User expectation:**
```typescript
const { src } = useScript('https://example.com/script.js', { bundle: true })
console.log(src) // Should be '/_scripts/[hash].js' but isn't available
```

## Investigation Findings

### Key Files Involved
- `src/plugins/transform.ts` - Build-time bundling transform
- `src/runtime/composables/useScript.ts` - Main useScript implementation
- `docs/content/docs/1.guides/2.bundling.md` - Bundle documentation

### Current Implementation Gap
1. **Runtime access missing**: No way to get the transformed src URL from script instance
2. **Documentation unclear**: Doesn't explain build-time vs runtime behavior
3. **No auto-injection**: No option to automatically inject bundled scripts into DOM
4. **Dynamic URL limitations**: Bundle only works with static strings

## Proposed Solutions

### 1. Documentation Fix (Immediate)
- Update bundling docs to clarify build-time transformation behavior
- Add examples showing the code transformation that occurs
- Explain when/why users need manual injection
- Document static URL requirement

### 2. Runtime Src Access (Medium Priority)
Add runtime access to the transformed src:
```typescript
const script = useScript('https://example.com/script.js', { bundle: true })
// script.src or script.entry.props.src should contain '/_scripts/[hash].js'
```

### 3. Auto-Injection Option (Lower Priority)
Add automatic injection capability:
```typescript
useScript('https://example.com/script.js', {
  bundle: true,
  inject: true  // Automatically inject into DOM
})
```

## Technical Implementation Strategy

### Phase 1: Documentation (Quick Win)
- File: `docs/content/docs/1.guides/2.bundling.md`
- Add section explaining build-time vs runtime behavior
- Include examples of manual injection patterns
- Document limitations (static URLs only)

### Phase 2: Runtime Src Access
- Modify transform plugin to preserve bundled src in script options
- Update `useScript` to expose the transformed src in return value
- Add TypeScript types for the new API

### Phase 3: Auto-Injection (Future Enhancement)
- Add `inject` option to script options
- Implement automatic DOM injection logic
- Update documentation with new option

## Complexity Assessment
- **Documentation Fix**: Low complexity, high impact
- **Runtime Src Access**: Medium complexity, involves build/runtime coordination
- **Auto-Injection**: Medium-high complexity, needs careful DOM management

## Impact
- **User Experience**: High - resolves major confusion point
- **Breaking Changes**: None for documentation and runtime access
- **Adoption**: Would improve bundle feature usability significantly

## Recommendation
Start with documentation improvements as quick win, then implement runtime src access for better developer experience.