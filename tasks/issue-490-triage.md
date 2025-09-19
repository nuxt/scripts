# Issue #490 Triage: Load GTAG ID by Domain or Language

## Summary
**Issue**: Load different Google Analytics GTAG IDs based on domain or language in multi-language apps

**Status**: Documentation request - functionality already exists
**Priority**: Low (documentation enhancement, not missing functionality)
**Type**: Documentation improvement

## Problem Description

User has a multi-language app with different domains and wants to load different Google Analytics tracking IDs based on the current domain/language. They're looking for a way to configure this globally rather than managing it per component.

## Root Cause Analysis

### Functionality Already Exists
After investigating the codebase, **the requested functionality is already fully supported** by the current nuxt-scripts implementation. The issue is not missing features but rather missing documentation and examples.

### Current Google Analytics Implementation
**File**: `src/runtime/registry/google-analytics.ts`

The Google Analytics implementation:
- ✅ Supports dynamic ID configuration
- ✅ Accepts reactive/computed values
- ✅ Supports multiple instances with different IDs
- ✅ Integrates with runtime configuration
- ✅ Works with i18n and domain detection

### Suggested Solution (Already Works)
**From issue comments** - this approach is valid and works:
```typescript
// Get the country
const currentCountry = useCurrentCountry()

// Map of id to country
const gtagPerCountry = {
  'pt-pt': 'XXX',
  'fr-fr': 'YYY',
}

const googleAnalytics = useScriptGoogleAnalytics({
  id: gtagPerCountry[currentCountry]
})
```

## Investigation Findings

### Current Capabilities
1. **Dynamic Configuration**: Scripts accept reactive values for all parameters
2. **Multiple Instances**: Support for multiple GA instances with unique keys
3. **Runtime Config**: Integration with Nuxt's runtime configuration
4. **Global Setup**: Can be configured globally via plugins or composables

### Example Implementations That Work Today

#### Option 1: Plugin-based Global Configuration
```typescript
// plugins/analytics.client.ts
export default defineNuxtPlugin(() => {
  const { locale } = useI18n() // or domain detection logic

  const gtagPerLocale = {
    'en': 'G-ENGLISH-ID',
    'fr': 'G-FRENCH-ID',
    'pt': 'G-PORTUGUESE-ID'
  }

  const googleAnalytics = useScriptGoogleAnalytics({
    id: gtagPerLocale[locale.value]
  })

  return {
    provide: {
      analytics: googleAnalytics
    }
  }
})
```

#### Option 2: Composable Approach
```typescript
// composables/useAnalyticsConfig.ts
export const useAnalyticsConfig = () => {
  const { locale } = useI18n()

  const analyticsConfig = {
    'en': 'G-ENGLISH-ID',
    'fr': 'G-FRENCH-ID',
    'pt': 'G-PORTUGUESE-ID'
  }

  return useScriptGoogleAnalytics({
    id: analyticsConfig[locale.value]
  })
}
```

#### Option 3: Multiple Instances for Different Domains
```typescript
// For complex multi-domain setups
const { gtag: enGtag } = useScriptGoogleAnalytics({
  key: 'en',
  id: 'G-ENGLISH-ID',
})

const { gtag: frGtag } = useScriptGoogleAnalytics({
  key: 'fr',
  id: 'G-FRENCH-ID',
})
```

### Integration with Existing Modules
- **@nuxtjs/i18n**: ✅ Works with locale detection
- **Custom domain detection**: ✅ Works with any domain logic
- **Runtime configuration**: ✅ Supports environment-based config
- **SSR/Client-side**: ✅ Works in both contexts

## Proposed Solution

### Documentation Enhancement (Immediate)
**File**: `docs/content/scripts/analytics/google-analytics.md`

Add new sections:

#### 1. Multi-Domain Setup Section
```markdown
## Multi-Domain and i18n Setup

For multi-language or multi-domain applications, you can configure different Google Analytics IDs based on locale or domain:

### Using with @nuxtjs/i18n
[Include examples...]

### Custom Domain Detection
[Include examples...]

### Global Configuration
[Include plugin and composable examples...]
```

#### 2. Dynamic Configuration Section
```markdown
## Dynamic Configuration

Google Analytics can be configured with reactive values:
[Include reactive/computed examples...]
```

#### 3. Best Practices Section
```markdown
## Best Practices for Multi-Language Apps

### When to Use Multiple Instances vs Single Instance
### Performance Considerations
### Data Segmentation Strategies
```

### Documentation Files to Update
1. **`docs/content/scripts/analytics/google-analytics.md`** - Main GA documentation
2. **`docs/content/docs/1.guides/`** - Add multi-domain guide
3. **`playground/pages/third-parties/google-analytics/`** - Add examples

## Technical Implementation Strategy

### Phase 1: Documentation (Immediate)
1. **Update GA documentation**: Add multi-domain examples
2. **Create examples**: Add playground examples for different scenarios
3. **Best practices guide**: Document recommended approaches

### Phase 2: Enhanced Examples (Short-term)
1. **i18n integration examples**: Show @nuxtjs/i18n integration
2. **Domain detection examples**: Various domain detection strategies
3. **Plugin templates**: Ready-to-use plugin examples

### Phase 3: Advanced Features (Future)
1. **Helper utilities**: Composables for common multi-domain patterns
2. **Configuration validation**: Type-safe configuration helpers
3. **Migration guides**: From other analytics solutions

## Complexity Assessment
- **Documentation**: Very low complexity, high impact
- **Examples**: Low complexity, immediate value
- **Helper utilities**: Low-medium complexity, nice-to-have
- **Breaking Changes**: None - purely additive documentation

## Impact
- **User Experience**: High - solves a common multi-language app need
- **Adoption**: Improves understanding of existing capabilities
- **SEO/Analytics**: Enables proper multi-domain analytics setup

## Alternative Solutions Considered

### Auto-Configuration (Not Recommended)
Could add automatic locale/domain detection, but this would:
- Be opinionated about i18n modules
- Reduce flexibility for custom setups
- Add complexity without significant benefit

### New APIs (Not Needed)
Could add new helper functions, but existing APIs already provide all needed functionality.

## Recommendation

This is a **documentation issue, not a feature request**. The functionality already exists and works well. The solution is:

1. **Immediate**: Update Google Analytics documentation with multi-domain examples
2. **Short-term**: Add playground examples and best practices guide
3. **Optional**: Create helper utilities if demand is high

The suggested solution from the issue comments is correct and should be documented as the recommended approach. No code changes are needed - only documentation improvements to help users discover and implement these patterns.