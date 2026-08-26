import { describe, expect, it } from 'vitest'
import registryTypes from '../../packages/script/src/registry-types.json'

describe('tawk-to generated types', () => {
  it('tawkToWindowType uses the documented inline/embed literals', () => {
    const declarations = (registryTypes as any).types['tawk-to'] as Array<{ name: string, code: string }>
    const declaration = declarations.find(d => d.name === 'TawkToWindowType')
    expect(declaration).toBeDefined()
    expect(declaration!.code).toMatch(/^export type TawkToWindowType = 'inline' \| 'embed'$/)
  })
})
