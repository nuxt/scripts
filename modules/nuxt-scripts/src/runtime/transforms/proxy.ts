import { defineScriptTransform } from '../util'
import { useProxyAsset } from '#imports'

export function ProxySrc() {
  return defineScriptTransform({
    name: 'proxy',
    transform(script) {
      if (script.src)
        script.src = useProxyAsset(script.src)
    },
  })
}
