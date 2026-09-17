import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { getRegistryTypes } from '../../packages/script/src/types-source'

/**
 * The camera shapes of `ScriptMapLibreMapProps`, which the generated
 * declaration references. Everything else the real props type references is
 * irrelevant to the camera requirement, so it is left out.
 */
const referencedTypes = `
interface ScriptMapLibreMapSharedProps { mapStyle: string }
interface ScriptMapLibreMapCenterCamera { center: unknown, bounds?: unknown }
interface ScriptMapLibreMapBoundsCamera { bounds: unknown, center?: unknown }
`

function generatedDeclaration(): string {
  const declaration = getRegistryTypes().maplibre.find(entry => entry.name === 'ScriptMapLibreMapProps')
  expect(declaration, 'ScriptMapLibreMapProps is generated into the maplibre registry types').toBeDefined()
  return declaration!.code
}

function semanticErrors(sourceText: string): string[] {
  const file = ts.createSourceFile('generated-props.ts', sourceText, ts.ScriptTarget.Latest, true)
  const defaultHost = ts.createCompilerHost({ strict: true, noEmit: true })
  const host: ts.CompilerHost = {
    ...defaultHost,
    getSourceFile(fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile) {
      return fileName === 'generated-props.ts'
        ? file
        : defaultHost.getSourceFile(fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile)
    },
    readFile(fileName) {
      return fileName === 'generated-props.ts' ? sourceText : defaultHost.readFile(fileName)
    },
    fileExists(fileName) {
      return fileName === 'generated-props.ts' || defaultHost.fileExists(fileName)
    },
    writeFile() {},
  }
  const program = ts.createProgram(['generated-props.ts'], { strict: true, noEmit: true }, host)
  return [...program.getSyntacticDiagnostics(file), ...program.getSemanticDiagnostics(file)]
    .map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '))
}

function frameMap(camera: string): string[] {
  return semanticErrors([
    referencedTypes,
    generatedDeclaration(),
    `const map: ScriptMapLibreMapProps = { mapStyle: 'https://example.com/style.json'${camera} }`,
  ].join('\n'))
}

describe('generated ScriptMapLibreMapProps', () => {
  it('rejects a map that frames the camera on neither center nor bounds', () => {
    const errors = frameMap('')
    // The compiler reports one required camera prop of the union it tried last.
    expect(errors.some(error => error.includes('center') || error.includes('bounds'))).toBe(true)
  })

  it('accepts a map framed on center', () => {
    expect(frameMap(', center: [0, 0]')).toEqual([])
  })

  it('accepts a map framed on bounds', () => {
    expect(frameMap(', bounds: [0, 0, 1, 1]')).toEqual([])
  })
})
