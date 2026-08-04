import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  entries: ['./src/cli'],
  rollup: {
    emitCJS: false,
  },
})
