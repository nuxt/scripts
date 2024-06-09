// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    // TODO: Consider setting it to true later.
    stylistic: false,
    tooling: true,
  },
})
  .override('nuxt/javascript', {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  })
  .override('nuxt/typescript/rules', {
    rules: {
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
        },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      // TODO: Discuss if we want to enable this
      '@typescript-eslint/no-invalid-void-type': 'off',
      // TODO: Discuss if we want to enable this
      '@typescript-eslint/no-explicit-any': 'off',
    },
  })
  .override('nuxt/vue/rules', {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/require-default-prop': 'off',
    },
  })
