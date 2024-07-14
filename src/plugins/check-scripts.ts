import { pathToFileURL } from 'node:url'
import { createUnplugin } from 'unplugin'
import { parseQuery, parseURL } from 'ufo'
import { type Node, walk } from 'estree-walker'
import type { CallExpression, ObjectPattern } from 'estree'

export function NuxtScriptsCheckScripts(options?: { throwExceptions: boolean }) {
  return createUnplugin(() => {
    return {
      name: 'nuxt-scripts:check-scripts',
      transformInclude(id) {
        const { pathname, search } = parseURL(decodeURIComponent(pathToFileURL(id).href))
        const { type } = parseQuery(search)

        if (pathname.includes('node_modules/@unhead') || pathname.includes('node_modules/vueuse'))
          return false

        // vue files
        if (pathname.endsWith('.vue') && (type === 'script' || !search))
          return true

        // // js files
        if (pathname.match(/\.((c|m)?j|t)sx?$/g))
          return true

        return false
      },

      async transform(code, id) {
        if (!code.includes('useScript')) // all integrations should start with useScript*
          return

        const ast = this.parse(code)
        let nameNode: Node | undefined
        let errorNode: Node | undefined
        walk(ast as Node, {
          enter(_node) {
            if (_node.type === 'VariableDeclaration' && _node.declarations?.[0]?.id?.type === 'ObjectPattern') {
              const objPattern = _node.declarations[0]?.id as ObjectPattern
              for (const property of objPattern.properties) {
                if (property.type === 'Property' && property.key.type === 'Identifier' && property.key.name === '$script' && property.value.type === 'Identifier') {
                  nameNode = _node
                }
              }
            }
            if (nameNode) {
              if (_node.type === 'SequenceExpression') {
                if (_node.expressions[1]?.type === 'AwaitExpression' && _node.expressions[0]?.type === 'AssignmentExpression' && _node.expressions[0]?.left?.type === 'ArrayPattern' && _node.expressions[0]?.right?.type === 'CallExpression') {
                  // check right call expression is calling $script
                  const right = _node.expressions[0].right as CallExpression
                  if (right.callee?.name === '_withAsyncContext' && right.arguments[0]?.body?.name === '$script') {
                    errorNode = nameNode
                  }
                }
              }
            }
          },
        })
        if (errorNode) {
          const err = new Error('You should avoid doing a top-level $script.load() as it will lead to a blocking load.')
          // testing purposes
          if (options?.throwExceptions) {
            throw err
          }
          return this.error(err, nameNode.loc?.start)
        }
      },
    }
  })
}
