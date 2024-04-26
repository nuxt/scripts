import { pathToFileURL } from 'node:url'
import { createUnplugin } from 'unplugin'
import { parseQuery, parseURL } from 'ufo'
import MagicString from 'magic-string'
import type { SourceMapInput } from 'rollup'
import type { Node } from 'estree-walker'
import { walk } from 'estree-walker'
import type { SimpleCallExpression } from 'estree'
import type { Input } from 'valibot'
import type { RegistryScripts } from '#nuxt-scripts'

export interface AssetBundlerTransformerOptions {
  resolveScript: (src: string) => string
  moduleDetected?: (module: string) => void
  defaultBundle?: boolean
  scripts?: RegistryScripts
}

export function NuxtScriptAssetBundlerTransformer(options: AssetBundlerTransformerOptions) {
  return createUnplugin(() => {
    return {
      name: 'nuxt:scripts:asset-bundler-transformer',

      transformInclude(id) {
        const { pathname, search } = parseURL(decodeURIComponent(pathToFileURL(id).href))
        const { type } = parseQuery(search)

        if (pathname.includes('node_modules/@unhead') || pathname.includes('node_modules/vueuse'))
          return false

        // vue files
        if (pathname.endsWith('.vue') && (type === 'script' || !search))
          return true

        // js files
        if (pathname.match(/\.((c|m)?j|t)sx?$/g))
          return true

        return false
      },

      async transform(code, id) {
        if (!code.includes('useScript')) // all integrations should start with useScriptX
          return

        const ast = this.parse(code)
        const s = new MagicString(code)
        walk(ast as Node, {
          enter(_node) {
            const calleeName = (_node as SimpleCallExpression).callee?.name
            // check it starts with useScriptX where X must be a A-Z alphabetical letter
            const isValidCallee = calleeName === 'useScript' || (calleeName?.startsWith('useScript') && /^[A-Z]$/.test(calleeName?.charAt(9)))
            if (
              _node.type === 'CallExpression'
              && _node.callee.type === 'Identifier'
              && isValidCallee) {
              // we're either dealing with useScript or an integration such as useScriptHotjar, we need to handle
              // both cases
              const fnName = _node.callee?.name
              const node = _node as SimpleCallExpression
              let scriptSrcNode: any | undefined
              let src: false | string | undefined
              if (fnName === 'useScript') {
                // do easy case first where first argument is a literal
                if (node.arguments[0].type === 'Literal') {
                  scriptSrcNode = node.arguments[0]
                }
                else if (node.arguments[0].type === 'ObjectExpression') {
                  const srcProperty = node.arguments[0].properties.find(
                    (p: any) => p.key?.name === 'src' || p.key?.value === 'src',
                  )
                  scriptSrcNode = srcProperty?.value
                }
              }
              else {
                // find the registry node
                const registryNode = options.scripts?.find(i => i.import.name === fnName)
                if (!registryNode) {
                  // silent failure
                  return
                }
                // TODO add stubs for any module integrations
                options.moduleDetected?.(registryNode.module)
                // this is only needed when we have a dynamic src that we need to compute
                if (!registryNode.scriptBundling && !registryNode.src)
                  return

                // integration case
                // extract the options as the first argument that we'll use to reconstruct the src
                const optionsNode = node.arguments[0]
                if (optionsNode?.type === 'ObjectExpression') {
                  const fnArg0 = {}
                  // extract literal values from the object to reconstruct the options
                  for (const prop of optionsNode.properties) {
                    if (prop.value.type === 'Literal')
                      // @ts-expect-error untyped
                      fnArg0[prop.key.name] = prop.value.value
                  }
                  const srcProperty = node.arguments[0].properties.find(
                    (p: any) => p.key?.name === 'src' || p.key?.value === 'src',
                  )
                  if (srcProperty?.value?.value) {
                    scriptSrcNode = srcProperty.value
                  }
                  else {
                    src = registryNode.scriptBundling && registryNode.scriptBundling(fnArg0 as any as Input<any>)
                    // not supported
                    if (src === false)
                      return
                  }
                }
              }

              if (scriptSrcNode || src) {
                src = src || scriptSrcNode.value
                if (src) {
                  let canBundle = options.defaultBundle
                  if (node.arguments[1]?.type === 'ObjectExpression') {
                    // second node needs to be an object with an property of assetStrategy and a value of 'bundle'
                    const bundleProperty = node.arguments[1]?.properties.find(
                      (p: any) => p.key?.name === 'bundle' || p.key?.value === 'bundle',
                    )
                    if (bundleProperty) {
                      if (String(bundleProperty?.value?.value) !== 'true') {
                        canBundle = false
                        return
                      }
                      if (node.arguments[1]?.properties.length === 1)
                        s.remove(node.arguments[1].start, node.arguments[1].end)
                      else
                        s.remove(bundleProperty.start, bundleProperty.end)

                      canBundle = true
                    }
                  }
                  if (canBundle) {
                    const newSrc = options.resolveScript(src)
                    if (scriptSrcNode) {
                      s.overwrite(scriptSrcNode.start, scriptSrcNode.end, `'${newSrc}'`)
                    }
                    else {
                      // check if there's a scriptInput property
                      const scriptInputProperty = node.arguments[0].properties.find(
                        (p: any) => p.key?.name === 'scriptInput' || p.key?.value === 'scriptInput',
                      )
                      // see if there is a script input on it
                      if (scriptInputProperty) {
                        const scriptInput = scriptInputProperty.value
                        if (scriptInput.type === 'ObjectExpression') {
                          const srcProperty = scriptInput.properties.find(
                            (p: any) => p.key?.name === 'src' || p.key?.value === 'src',
                          )
                          if (srcProperty)
                            s.overwrite(srcProperty.value.start, srcProperty.value.end, `'${newSrc}'`)
                          else
                            s.appendRight(scriptInput.end, `, src: '${newSrc}'`)
                        }
                      }
                      else {
                        s.appendRight(node.arguments[0].start + 1, ` scriptInput: { src: '${newSrc}' }, `)
                      }
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
