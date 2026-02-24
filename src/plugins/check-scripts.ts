import { createUnplugin } from 'unplugin'
import { parseAndWalk } from 'oxc-walker'
import type { Node } from 'oxc-parser'
import { isVue } from './util'

export function NuxtScriptsCheckScripts() {
  return createUnplugin(() => {
    return {
      name: 'nuxt-scripts:check-scripts',
      transform: {
        filter: {
          id: /\.vue/,
        },
        handler(code, id) {
          if (!isVue(id, { type: ['script'] }))
            return
          if (!code.includes('useScript')) // all integrations should start with useScript*
            return

          let nameNode: Node | undefined
          let errorNode: Node | undefined
          parseAndWalk(code, id, function (_node) {
            if (_node.type === 'VariableDeclaration' && (_node as any).declarations?.[0]?.id?.type === 'ObjectPattern') {
              const objPattern = (_node as any).declarations[0]?.id
              for (const property of objPattern.properties) {
                if (property.type === 'Property' && property.key.type === 'Identifier' && property.key.name === '$script' && property.value.type === 'Identifier') {
                  nameNode = _node
                }
              }
            }
            if (nameNode) {
              let sequence: any = _node.type === 'SequenceExpression' ? _node : null
              let assignmentExpression: any
              if (_node.type === 'VariableDeclaration') {
                if ((_node as any).declarations[0]?.init?.type === 'SequenceExpression') {
                  sequence = (_node as any).declarations[0]?.init
                  assignmentExpression = (_node as any).declarations[0]?.init?.expressions?.[0]
                }
              }
              if (sequence && !assignmentExpression) {
                assignmentExpression = (sequence.expressions[0]?.type === 'AssignmentExpression' ? sequence.expressions[0] : null)
              }
              if (assignmentExpression) {
              // check right call expression is calling $script
                const right = assignmentExpression?.right
                if (right.callee?.name === '_withAsyncContext') {
                  if (right.arguments[0]?.body?.name === '$script'
                    || right.arguments[0]?.body?.callee?.object?.name === '$script') {
                    errorNode = nameNode
                  }
                }
              }
            }
          })
          if (errorNode) {
            return this.error(new Error('You can\'t use a top-level await on $script as it will never resolve.'))
          }
        },
      },
    }
  })
}
