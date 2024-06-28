import { createUnplugin } from 'unplugin'
import type { AnyNode, VariableDeclarator, ExportDefaultDeclaration, Property } from 'acorn'
import { extname } from 'pathe'
import { parse } from 'acorn'
import { transform } from 'esbuild'

const SCRIPT_RE = /<script[^>]*>([\s\S]*)<\/script>/

export default () => createUnplugin(() => {
  return {
    name: 'nuxt-scripts:check-scripts',
    enforce: 'pre',
    async transform(code, id) {
      if (!code.includes('useScript')) // all integrations should start with useScript*
        return

      const extName = extname(id)
      if (extName === '.vue') {
        const scriptAst = await extractScriptContentAst(code)
        if (scriptAst) {
          analyzeNodes(id, scriptAst)
        }
      }
      else if (extName === '.ts' || extName === '.js') {
        if (!code.includes('defineComponent')) return

        let result = code

        if (extName === '.ts') {
          result = (await transform(code, { loader: 'ts' })).code
        }

        const setupFunction = extractSetupFunction(result)

        if (setupFunction) {
          analyzeNodes(id, setupFunction)
        }
      }

      return undefined
    },
  }
})

function analyzeNodes(id: string, nodes: AnyNode[]) {
  let name: string | undefined

  for (const node of nodes) {
    if (name) {
      if (isAwaitingLoad(name, node)) {
        throw new Error('Awaiting load should not be used at top level of a composable or <script>')
      }
    }
    else {
      if (node.type === 'VariableDeclaration') {
        name = findScriptVar(node.declarations[0])
      }
    }
  }
}

function findScriptVar(scriptDeclaration: VariableDeclarator) {
  if (scriptDeclaration.id.type === 'ObjectPattern') {
    for (const property of scriptDeclaration.id.properties) {
      if (property.type === 'Property' && property.key.type === 'Identifier' && property.key.name === '$script' && property.value.type === 'Identifier') {
        return property.value.name
      }
    }
  }
  else if (scriptDeclaration.id.type === 'Identifier') {
    return scriptDeclaration.id.name
  }
}

function isAwaitingLoad(name: string, node: AnyNode) {
  if (node.type === 'ExpressionStatement' && node.expression.type === 'AwaitExpression') {
    const arg = node.expression.argument
    if (arg.type === 'CallExpression') {
      const callee = arg.callee
      if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier' && callee.object.name === name) {
        // $script or alias is used
        if (callee.property.type === 'Identifier' && callee.property.name === 'load') {
          return true
        }
      }
    }
  }
}

async function extractScriptContentAst(code: string): Promise<AnyNode[] | undefined> {
  const scriptCode = code.match(SCRIPT_RE)
  return scriptCode
    ? parse((await transform(scriptCode[1], { loader: 'ts' })).code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
    }).body
    : undefined
}

function extractSetupFunction(code: string): AnyNode[] | undefined {
  const ast = parse(code, {
    ecmaVersion: 'latest',
    sourceType: 'module',
  })

  const defaultExport = ast.body.find((node): node is ExportDefaultDeclaration => node.type === 'ExportDefaultDeclaration')

  if (defaultExport && defaultExport.declaration.type === 'CallExpression' && defaultExport.declaration.callee.type === 'Identifier' && defaultExport.declaration.callee.name === 'defineComponent') {
    const arg = defaultExport.declaration.arguments[0]
    if (arg && arg.type === 'ObjectExpression') {
      const setupProperty = arg.properties.find((prop): prop is Property => prop.type === 'Property' && prop.key.type === 'Identifier' && prop.key.name === 'setup')
      if (setupProperty) {
        const setupValue = setupProperty.value
        if (setupValue.type === 'FunctionExpression') {
          return setupValue.body.body
        }
      }
    }
  }
}
