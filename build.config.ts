import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    './src/registry',
    { input: './src/cli', builder: 'rollup' },
  ],
})
