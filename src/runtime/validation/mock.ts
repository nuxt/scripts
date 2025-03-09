const noop = Object.freeze(
  Object.assign(
    () => {
      /** noop */
    },
    { __mock__: true },
  ),
)

export const parse = noop
export const object = noop
export const array = noop
export const string = noop
export const number = noop
export const boolean = noop
export const optional = noop
export const literal = noop
export const union = noop
export const record = noop
export const any = noop
export const minLength = noop

export const pipe = noop
