export interface SchemaFieldMeta {
  name: string
  type: string
  required: boolean
  description?: string
  defaultValue?: string
}

const JSDOC_START_RE = /^\s*\/\*\*/
const JSDOC_END_RE = /^\s*\*\//
const SINGLE_LINE_JSDOC_RE = /^\s*\/\*\*(.+?)\*\//
const DOC_LINE_RE = /^\s*\*\s?(.*)/
const DEFAULT_TAG_RE = /^@default\s*/
const INLINE_DEFAULT_RE = /(?:^|\s)@default\s*/
const FIELD_MATCH_RE = /^\s*(\w+)\s*\??:/

export function parseSchemaComments(code: string): Record<string, { description?: string, defaultValue?: string }> {
  const result: Record<string, { description?: string, defaultValue?: string }> = {}
  const lines = code.split('\n')
  let desc = ''
  let def = ''

  // Reads one complete `/** ... */` body. The text before an inline
  // `@default` is the description, the text after it is the value.
  function readDocContent(content: string) {
    const defaultMatch = content.match(INLINE_DEFAULT_RE)
    if (!defaultMatch) {
      if (content && !content.startsWith('@'))
        desc = content
      return
    }
    const descPart = content.slice(0, defaultMatch.index).trim()
    if (descPart && !descPart.startsWith('@'))
      desc = descPart
    def = content.slice(defaultMatch.index).trimStart().replace(DEFAULT_TAG_RE, '').trim()
  }

  for (let line of lines) {
    const singleLine = line.match(SINGLE_LINE_JSDOC_RE)
    if (singleLine) {
      desc = ''
      def = ''
      readDocContent(singleLine[1]!.trim())
      line = line.slice(singleLine[0].length)
      if (!line.trim())
        continue
    }
    else {
      if (JSDOC_START_RE.test(line)) {
        desc = ''
        def = ''
        continue
      }
      if (JSDOC_END_RE.test(line))
        continue
    }

    const docLine = line.match(DOC_LINE_RE)
    if (docLine) {
      const content = docLine[1]!.trim()
      if (content.startsWith('@default'))
        def = content.replace(DEFAULT_TAG_RE, '')
      else if (!content.startsWith('@') && content)
        desc += (desc ? ' ' : '') + content
      continue
    }

    const fieldMatch = line.match(FIELD_MATCH_RE)
    if (fieldMatch) {
      if (desc || def)
        result[fieldMatch[1]!] = { description: desc || undefined, defaultValue: def || undefined }
      desc = ''
      def = ''
    }
  }

  return result
}

/** Writes merged props fields as an interface body, for a props type that is not a literal. */
export function fieldsToInterfaceBody(fields: SchemaFieldMeta[]): string {
  const lines = fields.map((field) => {
    const doc = [field.description, field.defaultValue && `@default ${field.defaultValue}`].filter(Boolean).join(' ')
    return `${doc ? `  /** ${doc} */\n` : ''}  ${field.name}${field.required ? '' : '?'}: ${field.type}`
  })
  return `{\n${lines.join('\n')}\n}`
}
