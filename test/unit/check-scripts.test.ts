import { describe, it, expect } from 'vitest'
import { parse } from 'acorn-loose'
import { NuxtScriptsCheckScripts } from '../../src/plugins/check-scripts'

const plugin = NuxtScriptsCheckScripts({ throwExceptions: true }).vite() as any

async function transform(code: string | string[]) {
  const res = await plugin.transform.call(
    { parse: (code: string) => parse(code, { ecmaVersion: 2022, sourceType: 'module', allowImportExportEverywhere: true, allowAwaitOutsideFunction: true }) },
    Array.isArray(code) ? code.join('\n') : code,
    'file.js',
  )
  return res?.code
}

describe('vue parsed SFC', () => {
  it('expect to throw', async () => {
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

    expect(transform(code)).rejects.toMatchInlineSnapshot(`[Error: You should avoid doing a top-level $script.load() as it will lead to a blocking load.]`)
  })
  it('expect to not throw', () => {
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
    expect(transform(code)).resolves.toBeUndefined()
  })
})
