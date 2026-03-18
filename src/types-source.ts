import registryTypesJson from './registry-types.json'

const registryTypes = (registryTypesJson as any).types || registryTypesJson

export interface ExtractedDeclaration {
  name: string
  kind: 'interface' | 'type' | 'const'
  code: string
}

export interface SchemaFieldMeta {
  name: string
  type: string
  required: boolean
  description?: string
  defaultValue?: string
}

export function getRegistryTypes(): Record<string, ExtractedDeclaration[]> {
  return registryTypes as Record<string, ExtractedDeclaration[]>
}

export function getRegistrySchemaFields(): Record<string, SchemaFieldMeta[]> {
  return ((registryTypesJson as any).schemaFields || {}) as Record<string, SchemaFieldMeta[]>
}
