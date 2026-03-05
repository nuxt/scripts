import * as schemas from './registry-schemas'
import registryTypes from './registry-types.json'

export * from './registry-schemas'

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

function resolveType(schema: any): string {
  if (!schema)
    return 'unknown'
  switch (schema.type) {
    case 'string': return 'string'
    case 'number': return 'number'
    case 'boolean': return 'boolean'
    case 'array': return `${resolveType(schema.item)}[]`
    case 'object': return 'object'
    case 'union': return schema.options?.map((o: any) => resolveType(o)).join(' | ') || 'unknown'
    case 'literal': return typeof schema.literal === 'string' ? `'${schema.literal}'` : String(schema.literal)
    case 'record': return `Record<${resolveType(schema.key)}, ${resolveType(schema.value)}>`
    case 'custom': return 'Function'
    case 'any': return 'any'
    default: return schema.type || 'unknown'
  }
}

function parseComments(code: string): Record<string, { description?: string, defaultValue?: string }> {
  const result: Record<string, { description?: string, defaultValue?: string }> = {}
  const lines = code.split('\n')
  let desc = ''
  let def = ''

  for (const line of lines) {
    if (/^\s*\/\*\*/.test(line)) {
      desc = ''
      def = ''
      continue
    }
    if (/^\s*\*\//.test(line))
      continue

    const docLine = line.match(/^\s*\*\s?(.*)/)
    if (docLine) {
      const content = docLine[1]!.trim()
      if (content.startsWith('@default'))
        def = content.replace(/^@default\s*/, '')
      else if (!content.startsWith('@') && content)
        desc += (desc ? ' ' : '') + content
      continue
    }

    // Inline comment: field: ..., // description
    const colonIdx = line.indexOf(':')
    const commentIdx = colonIdx > 0 ? line.indexOf('//', colonIdx) : -1
    if (colonIdx > 0 && commentIdx > colonIdx) {
      const nameMatch = line.match(/^\s*(\w+)/)
      if (nameMatch) {
        const comment = line.slice(commentIdx + 2).trim()
        result[nameMatch[1]!] = { description: desc || comment, defaultValue: def || undefined }
        desc = ''
        def = ''
        continue
      }
    }

    // Plain field
    const fieldMatch = line.match(/^\s*(\w+)\s*:/)
    if (fieldMatch) {
      if (desc || def)
        result[fieldMatch[1]!] = { description: desc || undefined, defaultValue: def || undefined }
      desc = ''
      def = ''
    }
  }

  return result
}

export function getRegistrySchemaFields(): Record<string, SchemaFieldMeta[]> {
  const types = registryTypes as Record<string, any[]>
  const result: Record<string, SchemaFieldMeta[]> = {}

  for (const declarations of Object.values(types)) {
    for (const decl of declarations) {
      if (decl.kind !== 'const' || decl.name.endsWith('Defaults'))
        continue

      const schema = (schemas as any)[decl.name]
      if (!schema?.entries)
        continue

      const comments = parseComments(decl.code)
      const fields: SchemaFieldMeta[] = []

      for (const [name, entry] of Object.entries(schema.entries)) {
        const e = entry as any
        const isOptional = e.type === 'optional'
        const inner = isOptional ? e.wrapped : e

        fields.push({
          name,
          type: resolveType(inner),
          required: !isOptional,
          description: comments[name]?.description,
          defaultValue: comments[name]?.defaultValue,
        })
      }

      if (fields.length)
        result[decl.name] = fields
    }
  }

  return result
}
