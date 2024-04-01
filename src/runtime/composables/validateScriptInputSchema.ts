import { type BaseSchema, type Input, parse } from 'valibot'
import { createError } from '#imports'

export function validateScriptInputSchema<T extends BaseSchema<any>>(schema: T, options?: Input<T>) {
  if (import.meta.dev) {
    try {
      parse(schema, options)
    }
    catch (e) {
      // TODO nicer error handling
      createError({
        cause: e,
        message: 'Invalid script options',
      })
    }
  }
}
