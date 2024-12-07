import { describe, it, expect } from 'vitest'
import { parse } from 'acorn-loose'
import { NuxtScriptsCheckScripts } from '../../src/plugins/check-scripts'

const plugin = NuxtScriptsCheckScripts().vite() as any

async function transform(code: string | string[]) {
  const plugin = NuxtScriptsCheckScripts().raw({}, {} as any) as { transform: (code: string, id: string) => { code: string } | null }
  const errors = []
  await plugin.transform.call(
    {
      error: (e: Error) => {
        errors.push(e)
      },
    },
    Array.isArray(code) ? code.join('\n') : code,
    'file.vue',
  )
  return errors
}

describe('vue parsed SFC', () => {
  it('just await throws', async () => {
    const code = `
     import { withAsyncContext as _withAsyncContext, defineComponent as _defineComponent } from "vue";                                                                                             3:14:59 pm
import { useScript } from "#imports";
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

    expect(await transform(code)).toMatchInlineSnapshot(`[]`)
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

    expect(await transform(code)).toMatchInlineSnapshot(`[]`)
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

    expect(await transform(code)).toMatchInlineSnapshot(`[]`)
  })
  it('expect to not throw', async () => {
    const code = `
import { withAsyncContext as _withAsyncContext, defineComponent as _defineComponent } from "vue";                                                                                             3:14:59 pm
import { useScript } from "#imports";
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
