import { describe, expect, it } from 'vitest'
import { NuxtScriptsCheckScripts } from '../../packages/script/src/plugins/check-scripts'
import { runTransform } from '../utils/unplugin'

const plugin = NuxtScriptsCheckScripts().vite() as any

async function transform(code: string | string[], id = 'file.vue') {
  const errors: Error[] = []
  await runTransform(plugin, {
    id,
    code: Array.isArray(code) ? code.join('\n') : code,
    context: { error: (e: Error) => { errors.push(e) } },
  })
  return errors
}

describe('vue parsed SFC', () => {
  it('just await throws', async () => {
    const code = `
     import { withAsyncContext as _withAsyncContext, defineComponent as _defineComponent } from "vue";                                                                                             import { useScript } from "#imports";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "top-level-await",
  async setup(__props, { expose: __expose }) {
    __expose();
    let __temp, __restore;
    const { $script } = useScript("/test.js");
    [__temp, __restore] = _withAsyncContext(() => $script), await __temp, __restore();
    const __returned__ = { $script };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
        `

    expect(await transform(code)).toMatchInlineSnapshot(`
      [
        [Error: You can't use a top-level await on $script as it will never resolve.],
      ]
    `)
  })
  it('const await throws', async () => {
    const code = `
import { withAsyncContext as _withAsyncContext, defineComponent as _defineComponent } from "vue";                                                                                            
import { useScript } from "#imports";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "top-level-await-alt",
  async setup(__props, { expose: __expose }) {
    __expose();
    let __temp, __restore;
    const { $script } = useScript("/test.js");
    const res = ([__temp, __restore] = _withAsyncContext(() => $script), __temp = await __temp, __restore(), __temp);
    const __returned__ = { $script, res };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
        `

    expect(await transform(code)).toMatchInlineSnapshot(`
      [
        [Error: You can't use a top-level await on $script as it will never resolve.],
      ]
    `)
  })
  it('const await throws with a CallExpression on $script', async () => {
    const code = `
import { withAsyncContext as _withAsyncContext, defineComponent as _defineComponent } from "vue";                                                                                            
import { useScript } from "#imports";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "top-level-await-alt",
  async setup(__props, { expose: __expose }) {
    __expose();
    let __temp, __restore;
    const { $script } = useScript("/test.js");
    const res = ([__temp, __restore] = _withAsyncContext(() => $script.load()), __temp = await __temp, __restore(), __temp);
    const __returned__ = { $script, res };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
        `

    expect(await transform(code)).toMatchInlineSnapshot(`
      [
        [Error: You can't use a top-level await on $script as it will never resolve.],
      ]
    `)
  })
  it('expect to not throw', async () => {
    const code = `
import { withAsyncContext as _withAsyncContext, defineComponent as _defineComponent } from "vue";                                                                                             import { useScript } from "#imports";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "top-level-await",
  async setup(__props, { expose: __expose }) {
    __expose();
    let __temp, __restore;
    const { $script } = useScript("/test.js");
    const __returned__ = { $script };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
        `
    expect(await transform(code)).toMatchInlineSnapshot(`[]`)
  })
})

describe('module scope', () => {
  // Compiled shape of `await $script` in an SFC: the destructure, then `_withAsyncContext`.
  const offending = [
    'const { $script } = useScript("/test.js");',
    'let __temp, __restore;',
    '[__temp, __restore] = _withAsyncContext(() => $script), await __temp, __restore();',
  ].join('\n')

  it.each([
    ['file.vue', 'a bare SFC'],
    ['file.vue?vue&type=script&setup=true&lang.ts', 'an SFC script block'],
  ])('inspects %s (%s)', async (id) => {
    expect(await transform(offending, id)).not.toEqual([])
  })

  it.each([
    ['file.vue?vue&type=style&index=0&lang.css', 'a style block'],
    ['file.ts', 'a plain module'],
  ])('leaves %s alone (%s)', async (id) => {
    expect(await transform(offending, id)).toEqual([])
  })

  it('skips a component that never calls useScript', async () => {
    expect(await transform(`const answer = await fetchAnswer()`)).toEqual([])
  })
})
