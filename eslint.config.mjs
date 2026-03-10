import antfu from '@antfu/eslint-config'
import harlanzw from 'eslint-plugin-harlanzw'

export default antfu(
  {
    type: 'lib',
    ignores: [
      'CLAUDE.md',
      '.claude/**',
      'test/fixtures/**',
      'playground/**',
      'client/**',
      'examples/**',
    ],
    rules: {
      'no-use-before-define': 'off',
      'node/prefer-global/process': 'off',
      'node/prefer-global/buffer': 'off',
      'ts/explicit-function-return-type': 'off',
      'ts/ban-ts-comment': ['error', {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': 'allow-with-description',
      }],
      'ts/no-namespace': 'off',
      'ts/no-empty-object-type': 'off',
      'no-cond-assign': 'off',
      'vue/valid-template-root': 'off',
    },
  },
  {
    files: ['**/test/**/*.ts', '**/test/**/*.js'],
    rules: {
      'ts/no-unsafe-function-type': 'off',
      'no-console': 'off',
      'e18e/prefer-static-regex': 'off',
    },
  },
  ...harlanzw({ link: true, nuxt: true, vue: true, content: true }),
  {
    rules: {
      'harlanzw/vue-no-faux-composables': 'off',
      'harlanzw/vue-no-nested-reactivity': 'off',
    },
  },
  {
    files: ['**/registry/google-*.ts'],
    rules: {
      'unused-imports/no-unused-vars': 'off',
    },
  },
  {
    files: ['docs/**'],
    rules: {
      'no-new': 'off',
    },
  },
)
