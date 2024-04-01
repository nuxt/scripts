import { pathToFileURL } from 'node:url'
import { createUnplugin } from 'unplugin'
import { parseQuery, parseURL } from 'ufo'
import MagicString from 'magic-string'
import type { SourceMapInput } from 'rollup'
import type { Node } from 'estree-walker'
import { walk } from 'estree-walker'
import type { SimpleCallExpression } from 'estree'
import type { Import } from 'unimport'
import type { Input } from 'valibot'
import type { ModuleOptions } from '../module'

export interface AssetBundlerTransformerOptions {
  overrides?: ModuleOptions['overrides']
  resolveScript: (src: string) => string
  defaultBundle?: boolean
  registry?: (Import & { src?: string, key?: string, transform?: (options: any) => string })[]
}

export function NuxtScriptAssetBundlerTransformer(options: AssetBundlerTransformerOptions) {
  return createUnplugin(() => {
    return {
      name: 'nuxt:scripts:asset-bundler-transformer',
      enforce: 'post',

      transformInclude(id) {
        const { pathname, search } = parseURL(decodeURIComponent(pathToFileURL(id).href))
        const { type } = parseQuery(search)

        // vue files
        if (pathname.endsWith('.vue') && (type === 'script' || !search))
          return true

        // js files
        if (pathname.match(/\.((c|m)?j|t)sx?$/g))
          return true

        if (pathname.includes('node_modules/@unhead') || pathname.includes('node_modules/vueuse'))
          return false

        return false
      },

      async transform(code, id) {
        if (!code.includes('useScript')) // all integrations should start with useScriptX
          return

        const ast = this.parse(code)
        const s = new MagicString(code)
        walk(ast as Node, {
          enter(_node) {
            if (
              _node.type === 'CallExpression'
              && _node.callee.type === 'Identifier'
              && _node.callee?.name.startsWith('useScript')) {
              // we're either dealing with useScript or an integration such as useScriptHotjar, we need to handle
              // both cases
              const fnName = _node.callee?.name
              const node = _node as SimpleCallExpression
              let scriptKey: string | undefined
              let scriptSrcNode: any | undefined
              let src: string | undefined
              if (fnName === 'useScript') {
                // do easy case first where first argument is a literal
                if (node.arguments[0].type === 'Literal') {
                  scriptSrcNode = node.arguments[0]
                  scriptKey = scriptSrcNode.value as string
                }
                else if (node.arguments[0].type === 'ObjectExpression') {
                  const srcProperty = node.arguments[0].properties.find(
                    (p: any) => p.key?.name === 'src' || p.key?.value === 'src',
                  )
                  const keyProperty = node.arguments[0].properties.find(
                    (p: any) => p.key?.name === 'key' || p.key?.value === 'key',
                  )
                  scriptKey = keyProperty?.value?.value || srcProperty?.value
                  scriptSrcNode = srcProperty?.value
                }
              }
              else {
                // find the registry node
                const registryNode = options.registry?.find(i => i.name === fnName)
                if (!registryNode) {
                  console.error(`[Nuxt Scripts] Integration ${fnName} not found in registry`)
                  return
                }
                // this is only needed when we have a dynamic src that we need to compute
                if (!registryNode.transform && !registryNode.src)
                  return

                // integration case
                // extract the options as the first argument that we'll use to reconstruct the src
                const optionsNode = node.arguments[0]
                if (optionsNode?.type === 'ObjectExpression') {
                  const fnArg0 = {}
                  // extract literal values from the object to reconstruct the options
                  for (const prop of optionsNode.properties) {
                    if (prop.value.type === 'Literal')
                      fnArg0[prop.key.name] = prop.value.value
                  }
                  const srcProperty = node.arguments[0].properties.find(
                    (p: any) => p.key?.name === 'src' || p.key?.value === 'src',
                  )
                  if (srcProperty?.value?.value)
                    scriptSrcNode = srcProperty.value
                  else
                    src = registryNode.src || registryNode.transform?.(fnArg0 as any as Input<any>)
                  scriptKey = registryNode.key
                }
              }

              if (scriptSrcNode || src) {
                src = src || scriptSrcNode.value
                if (src) {
                  let canBundle = options.defaultBundle
                  if (node.arguments[1]?.type === 'ObjectExpression') {
                    // second node needs to be an object with an property of assetStrategy and a value of 'bundle'
                    const assetStrategyProperty = node.arguments[1]?.properties.find(
                      (p: any) => p.key?.name === 'assetStrategy' || p.key?.value === 'assetStrategy',
                    )
                    if (assetStrategyProperty) {
                      if (assetStrategyProperty?.value?.value !== 'bundle') {
                        canBundle = false
                        return
                      }
                      if (node.arguments[1]?.properties.length === 1)
                        s.remove(node.arguments[1].start, node.arguments[1].end)
                      else
                        s.remove(assetStrategyProperty.start, assetStrategyProperty.end)

                      canBundle = true
                    }
                  }
                  canBundle = canBundle || options.overrides?.[scriptKey]?.assetStrategy === 'bundle'
                  if (canBundle) {
                    const newSrc = options.resolveScript(src)
                    if (scriptSrcNode) {
                      s.overwrite(scriptSrcNode.start, scriptSrcNode.end, `'${newSrc}'`)
                    }
                    else {
                      // otherwise we need to append a `src: ${src}` after the last property
                      const lastProperty = node.arguments[0].properties[node.arguments[0].properties.length - 1]
                      s.appendRight(lastProperty.end, `, src: '${newSrc}'`)
                    }
                  }
                }
              }
            }
          },
        })

        if (s.hasChanged()) {
          return {
            code: s.toString(),
            map: s.generateMap({ includeContent: true, source: id }) as SourceMapInput,
          }
        }
      },
    }
  })
}
