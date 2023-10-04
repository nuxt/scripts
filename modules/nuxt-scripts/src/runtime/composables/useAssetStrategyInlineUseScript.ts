import { injectHead, useInlineAsset } from '#imports'

// makes all scripts loaded via useScript inline
// TODO test and document
export function useAssetStrategyInlineUseScript() {
  const head = injectHead()
  head.use({
    key: 'asset-strategy-inline-use-script',
    hooks: {
      'script:transform': (ctx) => {
        if (ctx.script.src) {
          const src = ctx.script.src
          delete ctx.script.src
          ctx.script = {
            ...ctx.script,
            ...useInlineAsset(src),
          }
        }
      },
    },
  })
}
