import { injectHead, useProxyAsset } from '#imports'

// makes all scripts loaded via useScript proxy
// TODO test and document
export function useAssetStrategyProxyUseScript() {
  const head = injectHead()
  head.use({
    key: 'asset-strategy-proxy-use-script',
    hooks: {
      'script:transform': function (ctx) {
        if (ctx.script.src)
          ctx.script.src = useProxyAsset(ctx.script.src)
      },
    },
  })
}
