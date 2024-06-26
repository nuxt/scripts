import { describe, expectTypeOf, it } from 'vitest'
import type { ModuleOptions } from '../../dist/module'
import type { ScriptRegistry } from '../../src/runtime/types'

describe('module options registry', async () => {
  it('expect no any', async () => {
    expectTypeOf<NonNullable<NonNullable<ModuleOptions>['registry']>[keyof ScriptRegistry]>().not.toBeAny()
  })
})
