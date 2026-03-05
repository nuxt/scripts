import registryTypes from './registry-types.json'

export * from './registry-schemas'

export interface ExtractedDeclaration {
  name: string
  kind: 'interface' | 'type' | 'const'
  code: string
}

export function getRegistryTypes(): Record<string, ExtractedDeclaration[]> {
  return registryTypes as Record<string, ExtractedDeclaration[]>
}
