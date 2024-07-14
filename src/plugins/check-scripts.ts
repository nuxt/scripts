import { createUnplugin } from 'unplugin'
import { type Node, walk } from 'estree-walker'
import type { AssignmentExpression, CallExpression, ObjectPattern, ArrowFunctionExpression, Identifier, MemberExpression } from 'estree'
import { isVue } from './util'

export function NuxtScriptsCheckScripts() {
  return createUnplugin(() => {
    return {
      name: 'nuxt-scripts:check-scripts',
      transformInclude(id) {
        return isVue(id, { type: ['script'] })
      },

      async transform(code) {
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
              let sequence = _node.type === 'SequenceExpression' ? _node : null
              let assignmentExpression
              if (_node.type === 'VariableDeclaration') {
                if (_node.declarations[0]?.init?.type === 'SequenceExpression') {
                  sequence = _node.declarations[0]?.init
                  assignmentExpression = _node.declarations[0]?.init?.expressions?.[0]
                }
              }
              if (sequence && !assignmentExpression) {
                assignmentExpression = (sequence.expressions[0]?.type === 'AssignmentExpression' ? sequence.expressions[0] : null)
              }
              if (assignmentExpression) {
                // check right call expression is calling $script
                const right = (assignmentExpression as AssignmentExpression)?.right as CallExpression
                // @ts-expect-error untyped
                if (right.callee?.name === '_withAsyncContext') {
                  if (((right.arguments[0] as ArrowFunctionExpression)?.body as Identifier)?.name === '$script'
                    || ((((right.arguments[0] as ArrowFunctionExpression)?.body as CallExpression)?.callee as MemberExpression)?.object as Identifier)?.name === '$script') {
                    errorNode = nameNode
                  }
                }
              }
            }
          },
        })
        if (errorNode) {
          return this.error(new Error('You can\'t use a top-level await on $script as it will never resolve.'))
        }
      },
    }
  })
}
