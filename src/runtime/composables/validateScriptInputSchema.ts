import { type Input, type ObjectSchema, parse } from 'valibot'
import { createError } from '#imports'

/**
 * injectScript
 *
 * Checks if a script with the 'key' value exists in head.
 */
export function validateScriptInputSchema<T extends ObjectSchema<any>>(schema: T, options?: Input<T>) {
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
