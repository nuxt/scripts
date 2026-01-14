export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  // Mock PostHog decide endpoint (for feature flags)
  if (path.includes('/decide')) {
    return {
      featureFlags: {
        'test-feature-flag': true,
      },
      featureFlagPayloads: {
        'test-feature-flag': {
          variant: 'test',
          data: { key: 'value' },
        },
      },
    }
  }

  // Mock PostHog batch endpoint (for event capture)
  if (path.includes('/batch') || path.includes('/capture')) {
    return {
      status: 1,
    }
  }

  // Default mock response
  return {
    status: 1,
  }
})
