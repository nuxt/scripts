# Nuxt Scripts Issues Implementation Roadmap

## Overview

This document outlines the implementation plan for 6 triaged GitHub issues, organized by priority and complexity. Start with quick wins to deliver immediate value, then progress to more complex features.

## Quick Wins (Immediate Implementation - 1-2 days)

### 🚀 Priority 1: Issue #482 - Google Tag Manager Source Option

**Estimated Time**: 2-3 hours
**Risk**: Very Low
**Impact**: High (enables server-side GTM setups)

**Files to modify**:
1. `src/runtime/registry/google-tag-manager.ts` (lines 82-112, 135)
2. `docs/content/scripts/tracking/google-tag-manager.md`

**Implementation steps**:
1. Add `source: optional(string())` to `GoogleTagManagerOptions` schema
2. Update URL construction: `withQuery(opts.source || 'https://www.googletagmanager.com/gtm.js', { ... })`
3. Add JSDoc documentation for the new option
4. Update documentation with examples
5. Add playground example

**Code changes**:
```typescript
// In GoogleTagManagerOptions schema
/** The URL of the script; useful for server-side GTM */
source: optional(string()),

// In script loading logic
src: withQuery(opts.source || 'https://www.googletagmanager.com/gtm.js', {
  // existing query parameters
})
```

**Testing**: Basic URL parameter testing, no breaking changes

---

### 🚀 Priority 2: Issue #490 - Multi-Domain GTAG Documentation

**Estimated Time**: 3-4 hours
**Risk**: None (documentation only)
**Impact**: High (helps many users with multi-language apps)

**Files to modify**:
1. `docs/content/scripts/analytics/google-analytics.md`
2. `playground/pages/third-parties/google-analytics/` (add examples)

**Implementation steps**:
1. Add "Multi-Domain Setup" section to GA docs
2. Add "Dynamic Configuration" examples
3. Include i18n integration examples
4. Add plugin and composable examples
5. Create playground examples for different scenarios

**Example content to add**:
```markdown
## Multi-Domain and i18n Setup

### Using with @nuxtjs/i18n
[Plugin example, composable example, runtime config example]

### Custom Domain Detection
[Domain-based configuration examples]

### Best Practices
[Performance considerations, data segmentation strategies]
```

**Testing**: Documentation review, example verification

---

### 🚀 Priority 3: Issue #481 - DevTools 500 Error Fix

**Estimated Time**: 1-2 hours
**Risk**: Low
**Impact**: Medium (fixes broken DevTools functionality)

**Files to modify**:
1. `client/app.vue` (lines 15, 57)

**Implementation steps**:
1. Add null safety to `syncScripts` function
2. Add safe access when calling `syncScripts`
3. Test with Nuxt 4 setup
4. Verify no regression in Nuxt 3

**Code changes**:
```typescript
// In syncScripts function
function syncScripts(_scripts: any[]) {
  if (!_scripts || typeof _scripts !== 'object') {
    scripts.value = {}
    return
  }
  // ... rest of function
}

// In DevTools connection
syncScripts(client.host.nuxt._scripts || {})
```

**Testing**: Create Nuxt 4 setup with empty script IDs, verify DevTools loads

## Medium Priority (1-2 weeks)

### 🔧 Priority 4: Issue #483 - Nuxt 4 TypeScript Types

**Estimated Time**: 1-2 days
**Risk**: Medium (requires TypeScript system understanding)
**Impact**: High (critical for Nuxt 4 compatibility)

**Files to modify**:
1. `src/module.ts` (around line 227)

**Implementation approach**:
Use Nuxt's TypeScript hooks to ensure proper path mapping:
```typescript
nuxt.hooks.hook('typescript:setup', async (options) => {
  if (options.tsConfig?.compilerOptions?.paths) {
    options.tsConfig.compilerOptions.paths['#nuxt-scripts/*'] = [
      await resolvePath('./runtime/*')
    ]
  }
})
```

**Testing requirements**:
- Test with Nuxt 3.16+ and Nuxt 4
- Verify type resolution in `nuxt.config.ts`
- Ensure backward compatibility

---

### 🔧 Priority 5: Issue #466 - Bundle Documentation and Runtime Access

**Estimated Time**: 2-3 days
**Risk**: Medium (involves build/runtime coordination)
**Impact**: High (major UX improvement for bundling)

**Phase 1 - Documentation Fix (Quick)**: 1-2 hours
**Files**: `docs/content/docs/1.guides/2.bundling.md`

Add section explaining:
- Build-time vs runtime behavior
- Static URL requirements
- Manual injection patterns
- Limitations and workarounds

**Phase 2 - Runtime Src Access (Complex)**: 1-2 days
**Files**:
- `src/plugins/transform.ts`
- `src/runtime/composables/useScript.ts`

Preserve bundled src in script options and expose in return value.

## Lower Priority (Future Releases)

### 🔮 Priority 6: Issue #485 - Force Download Option

**Estimated Time**: 1-2 days
**Risk**: Medium (affects cache logic)
**Impact**: Medium (useful for development workflows)

**Files to modify**:
1. `src/runtime/types.ts` - Add `forceDownload` type
2. `src/plugins/transform.ts` - Modify cache logic
3. `src/module.ts` - Pass configuration to transformer

**Implementation approach**:
```typescript
// Skip cache if forceDownload is true
if (!forceDownload && await storage.hasItem(`bundle:${filename}`)) {
  // return cached version
}
// proceed with download
```

**Performance considerations**:
- Default to `false` to maintain performance
- Add warnings about build time impact
- Document best practices

## Implementation Guidelines

### Before Starting
1. **Review triage files**: Read detailed analysis in `tasks/issue-XXX-triage.md`
2. **Set up test environment**: Ensure you can test locally with both Nuxt 3 and 4
3. **Check dependencies**: Verify all required tools and packages

### During Implementation
1. **Follow existing patterns**: Match code style and architectural decisions
2. **Add comprehensive tests**: Include unit tests and integration tests
3. **Update TypeScript types**: Ensure type safety for new features
4. **Document changes**: Update relevant documentation

### Quality Checklist
- [ ] **No breaking changes**: All changes are backward compatible
- [ ] **Type safety**: All new options are properly typed
- [ ] **Performance**: Consider impact on build times and bundle size
- [ ] **Documentation**: Update docs and add examples
- [ ] **Testing**: Add tests for new functionality
- [ ] **Cross-version compatibility**: Test with Nuxt 3.16+ and Nuxt 4

### Testing Strategy
1. **Unit tests**: For individual functions and components
2. **Integration tests**: For module behavior and TypeScript resolution
3. **Playground testing**: Use existing playground for manual testing
4. **Cross-platform testing**: Test on different operating systems if relevant

## Success Metrics

### Quick Wins (Week 1)
- [ ] Issue #482: GTM source option working
- [ ] Issue #490: Multi-domain documentation published
- [ ] Issue #481: DevTools error fixed

### Medium Priority (Week 2-3)
- [ ] Issue #483: Nuxt 4 TypeScript types working
- [ ] Issue #466: Bundle documentation improved

### Future Release
- [ ] Issue #485: Force download option implemented
- [ ] All issues have comprehensive test coverage
- [ ] Documentation is complete and accurate

## Additional Notes

### Code Review Focus Areas
1. **Type safety**: Ensure all new options are properly typed
2. **Performance impact**: Minimize build time and runtime overhead
3. **Backward compatibility**: No breaking changes to existing APIs
4. **Error handling**: Graceful degradation for edge cases

### Common Pitfalls to Avoid
1. **Hardcoded values**: Use configurable options where appropriate
2. **Missing null checks**: Always handle undefined/null values
3. **Breaking type changes**: Maintain existing type contracts
4. **Insufficient testing**: Test edge cases and error conditions

Start with the quick wins to build momentum and deliver immediate value to users. The order is optimized for impact vs. effort ratio.