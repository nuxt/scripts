// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import pluginNode from 'eslint-plugin-n'

export default createConfigForNuxt({
  features: {
    stylistic: true,
    tooling: true,
  },
  dirs: {
    src: ['./src', './client', './docs'],
  },
})
  .override('nuxt/typescript/rules', {
    rules: {
      '@typescript-eslint/no-empty-object-type': ['off'],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': 'allow-with-description',
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
      'vue/no-multiple-template-root': 'off',
      // NOTE: Disable this style rules if stylistic is not enabled
      'vue/max-attributes-per-line': 'off',
      // Disabled for Google Maps SFC components that use conditional rendering without root elements
      'vue/valid-template-root': 'off',
    },
  })
  .append({
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  })
  .append({
    plugins: {
      node: pluginNode,
    },
    rules: {
      'node/handle-callback-err': ['error', '^(err|error)$'],
      'node/no-deprecated-api': 'error',
      'node/no-exports-assign': 'error',
      'node/no-new-require': 'error',
      'node/no-path-concat': 'error',
      'node/process-exit-as-throw': 'error',
    },
  })
