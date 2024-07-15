import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNuxt } from '@nuxt/kit'
import { TSESTree, parse } from '@typescript-eslint/typescript-estree'
import { generateTpcContent, type ScriptContentOpts } from '../../src/tpc/utils'

vi.mock('@nuxt/kit', async (og) => {
  const mod = await og<typeof import('@nuxt/kit')>()
  return {
    ...mod,
    useNuxt: vi.fn(mod.useNuxt),
  }
})

describe.each([
  {
    env: 'production',
    isDev: false,
  },
  {
    env: 'development',
    isDev: true,
  },
])('tpc composable generation in $env', ({ isDev }) => {
  beforeEach(() => {
    // @ts-expect-error mock only needed properties
    vi.mocked(useNuxt).mockReturnValue({ options: { dev: isDev } })
  })

  it('expect to throw if no main scripts', () => {
    expect(() => generateTpcContent({
      data: {
        scripts: [],
        id: 'google-analytics',
        description: 'for test purpose',
      },
      tpcKey: 'google-analytics',
      tpcTypeImport: 'GoogleAnalyticsInput',
      scriptFunctionName: 'useScriptGoogleAnalytics',
      use: () => { },
      stub: () => { },
    })).rejects.toThrow('no main script found for google-analytics in third-party-capital')
  })

  describe('script content generation', () => {
    const input: ScriptContentOpts = {
      data: {
        id: 'google-analytics',
        scripts: [
          {
            key: 'google-analytics',
            params: ['id'],
            url: 'https://www.google-analytics.com/analytics.js',
            strategy: 'client',
            location: 'head',
            action: 'prepend',
          },
        ],
        description: 'for test purpose',
      },
      tpcKey: 'google-analytics',
      tpcTypeImport: 'GoogleAnalyticsInput',
      scriptFunctionName: 'useScriptGoogleAnalytics',
      use: () => {
        return { dataLayer: window.dataLayer, gtag: window.gtag }
      },
      stub: () => {
        return []
      },
    }

    it(`expect to${isDev ? '' : ' not'} add the schema to the script options`, async () => {
      const result = await generateTpcContent(input)
      const returnStatement = getTpcScriptReturnStatement(result, 'useScriptGoogleAnalytics')
      if (!returnStatement || returnStatement.argument?.type !== TSESTree.AST_NODE_TYPES.CallExpression || (returnStatement.argument?.callee as TSESTree.Identifier).name !== 'useRegistryScript') {
        throw new Error('TPC Scripts must return a call expression of useRegistryScript')
      }
      const optionFnTree = returnStatement.argument.arguments[1] as TSESTree.ArrowFunctionExpression
      const optionFnReturn = optionFnTree.body as TSESTree.ObjectExpression
      const scriptOptionAst = optionFnReturn.properties.find((node): node is TSESTree.Property => node.type === TSESTree.AST_NODE_TYPES.Property && node.key.type === TSESTree.AST_NODE_TYPES.Identifier && node.key.name === 'scriptOptions')!

      const useFn = (scriptOptionAst.value as TSESTree.ObjectExpression).properties.find(node => node.type === TSESTree.AST_NODE_TYPES.Property && node.key.type === TSESTree.AST_NODE_TYPES.Identifier && node.key.name === 'use')
      if (!useFn) throw new Error('use function not found')
      expect(getCodeFromAst(result, useFn)).toContain('return { dataLayer: window.dataLayer, gtag: window.gtag }')

      const schemaNode = optionFnReturn.properties.find(node => node.type === TSESTree.AST_NODE_TYPES.Property && node.key.type === TSESTree.AST_NODE_TYPES.Identifier && node.key.name === 'schema')
      if (isDev) {
        expect(schemaNode).toBeTruthy()
        expect(getCodeFromAst(result, schemaNode!)).toContain('schema: OptionSchema')
      }
      else {
        expect(schemaNode).toBeUndefined()
      }
    })

    it('expect to stringify the use and stub functions', async () => {
      const result = await generateTpcContent(input)
      const returnStatement = getTpcScriptReturnStatement(result, 'useScriptGoogleAnalytics')
      if (!returnStatement || returnStatement.argument?.type !== TSESTree.AST_NODE_TYPES.CallExpression || (returnStatement.argument?.callee as TSESTree.Identifier).name !== 'useRegistryScript') {
        throw new Error('TPC Scripts must return a call expression of useRegistryScript')
      }
      const optionFnTree = returnStatement.argument.arguments[1] as TSESTree.ArrowFunctionExpression
      const optionFnReturn = optionFnTree.body as TSESTree.ObjectExpression
      const scriptOptionAst = optionFnReturn.properties.find((node): node is TSESTree.Property => node.type === TSESTree.AST_NODE_TYPES.Property && node.key.type === TSESTree.AST_NODE_TYPES.Identifier && node.key.name === 'scriptOptions')!

      const useFn = (scriptOptionAst.value as TSESTree.ObjectExpression).properties.find(node => node.type === TSESTree.AST_NODE_TYPES.Property && node.key.type === TSESTree.AST_NODE_TYPES.Identifier && node.key.name === 'use')
      if (!useFn) throw new Error('use function not found')
      expect(getCodeFromAst(result, useFn)).toContain('return { dataLayer: window.dataLayer, gtag: window.gtag }')

      const stubFn = (scriptOptionAst.value as TSESTree.ObjectExpression).properties.find(node => node.type === TSESTree.AST_NODE_TYPES.Property && node.key.type === TSESTree.AST_NODE_TYPES.Identifier && node.key.name === 'stub')
      if (!stubFn) throw new Error('stub function not found')
      expect(getCodeFromAst(result, stubFn)).toContain('return []')
    })

    it('expect to augment window types', async () => {
      const result = await generateTpcContent(input)
      const ast = parse(result, { loc: true, range: true })
      const augmentWindowTypes = ast.body.find((node): node is TSESTree.TSModuleDeclaration => node.type === TSESTree.AST_NODE_TYPES.TSModuleDeclaration)
      expect(augmentWindowTypes).toBeTruthy()
      expect(getCodeFromAst(result, augmentWindowTypes!)).toContain('interface Window extends GoogleAnalyticsInput {}')
    })
  })
})

describe('script content generation with head positioning', () => {
  const inputBase: ScriptContentOpts = {
    data: {
      id: 'google-analytics',
      scripts: [
        {
          key: 'google-analytics',
          params: ['id'],
          url: 'https://www.google-analytics.com/analytics.js',
          strategy: 'client',
          location: 'body',
          action: 'append',
        },
      ],
      description: 'for test purpose',
    },
    tpcKey: 'google-analytics',
    tpcTypeImport: 'GoogleAnalyticsInput',
    scriptFunctionName: 'useScriptGoogleAnalytics',
    use: () => { },
    stub: () => { },
  }

  describe('main script', () => {
    it('main script post body position', async () => {
      const scriptOptsAst = getTpcScriptOptsASt(await generateTpcContent(inputBase), 'useScriptGoogleAnalytics')
      expect(getCodeFromAst(await generateTpcContent(inputBase), scriptOptsAst)).toContain('"tagPosition":"bodyClose"')
    })
    it('main script pre body position', async () => {
      const scriptOptsAst = getTpcScriptOptsASt(await generateTpcContent({
        ...inputBase,
        data: {
          ...inputBase.data,
          scripts: [{
            ...inputBase.data.scripts![0],
            action: 'prepend',
          }],
        },
      }), 'useScriptGoogleAnalytics')
      expect(getCodeFromAst(await generateTpcContent(inputBase), scriptOptsAst)).toContain('"tagPosition":"bodyClose"')
    })
  })
})

function getTpcScriptAst(code: string, name: string) {
  const ast = parse(code, { loc: true, range: true })
  const tpcScriptAst = ast.body.find((node): node is TSESTree.ExportDefaultDeclaration => node.type === TSESTree.AST_NODE_TYPES.ExportNamedDeclaration && node.declaration?.type === TSESTree.AST_NODE_TYPES.FunctionDeclaration && node.declaration.id?.name === name)
  if (!tpcScriptAst) {
    throw new Error(`no function declaration found for ${name}`)
  }

  const functionAst = tpcScriptAst.declaration

  return functionAst as TSESTree.FunctionDeclaration
}

function getCodeFromAst(code: string, ast: TSESTree.Node) {
  return code.slice(ast.range[0], ast.range[1])
}

function getTpcScriptReturnStatement(code: string, name: string) {
  const tpcScriptAst = getTpcScriptAst(code, name)
  const returnStatement = tpcScriptAst.body.body.find((node): node is TSESTree.ReturnStatement => node.type === TSESTree.AST_NODE_TYPES.ReturnStatement)
  if (!returnStatement) {
    throw new Error('TPC Scripts must return a call expression of useRegistryScript')
  }
  return returnStatement
}

function getTpcScriptOptsASt(code: string, name: string) {
  const returnStatement = getTpcScriptReturnStatement(code, name)
  if (!returnStatement || returnStatement.argument?.type !== TSESTree.AST_NODE_TYPES.CallExpression || (returnStatement.argument?.callee as TSESTree.Identifier).name !== 'useRegistryScript') {
    throw new Error('TPC Scripts must return a call expression of useRegistryScript')
  }
  const optionFnTree = returnStatement.argument.arguments[1] as TSESTree.ArrowFunctionExpression
  const optionFnReturn = optionFnTree.body as TSESTree.ObjectExpression
  const scriptOptionAst = optionFnReturn.properties.find((node): node is TSESTree.Property => node.type === TSESTree.AST_NODE_TYPES.Property && node.key.type === TSESTree.AST_NODE_TYPES.Identifier && node.key.name === 'scriptOptions')!
  if (!scriptOptionAst) throw new Error('scriptOptions not found')
  return scriptOptionAst
}
