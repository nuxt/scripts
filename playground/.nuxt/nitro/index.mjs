import 'unenv/runtime/polyfill/fetch.node';
import { Server } from 'http';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { parentPort, threadId } from 'worker_threads';
import { provider, isWindows } from 'std-env';
import { createApp, useBase } from 'h3';
import { createFetch as createFetch$1, Headers } from 'ohmyfetch';
import destr from 'destr';
import { createCall, createFetch } from 'unenv/runtime/fetch/index';
import { error404, errorDev } from '@nuxt/design';
import { createRenderer } from 'vue-bundle-renderer';
import devalue from '@nuxt/devalue';
import defu from 'defu';
import { joinURL } from 'ufo';
import htmlTemplate from '/home/pooya/Code/script-module/playground/.nuxt/views/document.template.mjs';
import { renderToString as renderToString$2 } from 'vue/server-renderer';

const _runtimeConfig = {public:{app:{baseURL:"\u002F",buildAssetsDir:"\u002F_nuxt\u002F",assetsPath:{},cdnURL:null}},private:{}};
for (const type of ["private", "public"]) {
  for (const key in _runtimeConfig[type]) {
    _runtimeConfig[type][key] = destr(process.env[key] || _runtimeConfig[type][key]);
  }
}
const appConfig = _runtimeConfig.public.app;
appConfig.baseURL = process.env.NUXT_APP_BASE_URL || appConfig.baseURL;
appConfig.cdnURL = process.env.NUXT_APP_CDN_URL || appConfig.cdnURL;
appConfig.buildAssetsDir = process.env.NUXT_APP_BUILD_ASSETS_DIR || appConfig.buildAssetsDir;
const privateConfig = deepFreeze(defu(_runtimeConfig.private, _runtimeConfig.public));
const publicConfig = deepFreeze(_runtimeConfig.public);
const config = privateConfig;
function deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      deepFreeze(value);
    }
  }
  return Object.freeze(object);
}

function baseURL() {
  return config.app.baseURL;
}
function buildAssetsURL(...path) {
  return joinURL(publicAssetsURL(), config.app.buildAssetsDir, ...path);
}
function publicAssetsURL(...path) {
  const publicBase = config.app.cdnURL || config.app.baseURL;
  return path.length ? joinURL(publicBase, ...path) : publicBase;
}

const globalTiming = globalThis.__timing__ || {
  start: () => 0,
  end: () => 0,
  metrics: []
};
function timingMiddleware(_req, res, next) {
  const start = globalTiming.start();
  const _end = res.end;
  res.end = (data, encoding, callback) => {
    const metrics = [["Generate", globalTiming.end(start)], ...globalTiming.metrics];
    const serverTiming = metrics.map((m) => `-;dur=${m[1]};desc="${encodeURIComponent(m[0])}"`).join(", ");
    if (!res.headersSent) {
      res.setHeader("Server-Timing", serverTiming);
    }
    _end.call(res, data, encoding, callback);
  };
  next();
}

const cwd = process.cwd();
const hasReqHeader = (req, header, includes) => req.headers[header] && req.headers[header].toLowerCase().includes(includes);
function handleError(error, req, res) {
  const isJsonRequest = hasReqHeader(req, "accept", "application/json") || hasReqHeader(req, "user-agent", "curl/") || hasReqHeader(req, "user-agent", "httpie/");
  const stack = (error.stack || "").split("\n").splice(1).filter((line) => line.includes("at ")).map((line) => {
    const text = line.replace(cwd + "/", "./").replace("webpack:/", "").replace(".vue", ".js").trim();
    return {
      text,
      internal: line.includes("node_modules") && !line.includes(".cache") || line.includes("internal") || line.includes("new Promise")
    };
  });
  const is404 = error.statusCode === 404;
  const errorObject = {
    statusCode: error.statusCode || 500,
    statusMessage: is404 ? "Page Not Found" : "Internal Server Error",
    description: !is404 ? `
    <h1>${error.message}</h1>
    <pre>${stack.map((i) => `<span class="stack${i.internal ? " internal" : ""}">${i.text}</span>`).join("\n")}</pre>
    ` : ""
  };
  res.statusCode = error.statusCode || 500;
  res.statusMessage = error.statusMessage || "Internal Server Error";
  if (!is404) {
    console.error(error.message + "\n" + stack.map((l) => "  " + l.text).join("  \n"));
  }
  if (isJsonRequest) {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(errorObject));
  }
  const errorTemplate = is404 ? error404 : errorDev ;
  const html = errorTemplate(errorObject);
  res.setHeader("Content-Type", "text/html;charset=UTF-8");
  res.end(html);
}

const middleware = [];

const app = createApp({
  debug: destr(true),
  onError: handleError
});
app.use(timingMiddleware);
app.use(middleware);
app.use(() => Promise.resolve().then(function () { return render; }).then((e) => e.renderMiddleware), { lazy: true });
app.stack;
const handle = useBase(baseURL(), app);
const localCall = createCall(handle);
const localFetch = createFetch(localCall, globalThis.fetch);
const $fetch = createFetch$1({ fetch: localFetch, Headers });
globalThis.$fetch = $fetch;

const server = new Server(handle);
function getAddress() {
  if (provider === "stackblitz" || process.env.NITRO_NO_UNIX_SOCKET) {
    return "0";
  }
  const socketName = `worker-${process.pid}-${threadId}.sock`;
  if (isWindows) {
    return join("\\\\.\\pipe\\nitro", socketName);
  } else {
    const socketDir = join(tmpdir(), "nitro");
    mkdirSync(socketDir, { recursive: true });
    return join(socketDir, socketName);
  }
}
const listenAddress = getAddress();
server.listen(listenAddress, () => {
  const _address = server.address();
  parentPort.postMessage({
    event: "listen",
    address: typeof _address === "string" ? { socketPath: _address } : `http://localhost:${_address.port}`
  });
});

const STATIC_ASSETS_BASE = "/_nuxt/home/pooya/Code/script-module/playground/dist" + "/" + "1646746278";
const PAYLOAD_JS = "/payload.js";
const getClientManifest = cachedImport(() => import('/home/pooya/Code/script-module/playground/.nuxt/dist/server/client.manifest.mjs'));
const getSSRApp = cachedImport(() => import('/home/pooya/Code/script-module/playground/.nuxt/dist/server/server.mjs'));
const getSSRRenderer = cachedResult(async () => {
  const clientManifest = await getClientManifest();
  if (!clientManifest) {
    throw new Error("client.manifest is not available");
  }
  const createSSRApp = await getSSRApp();
  if (!createSSRApp) {
    throw new Error("Server bundle is not available");
  }
  const { renderToString: renderToString2 } = await Promise.resolve().then(function () { return vue3; });
  return createRenderer(createSSRApp, { clientManifest, renderToString: renderToString2, publicPath: buildAssetsURL() }).renderToString;
});
const getSPARenderer = cachedResult(async () => {
  const clientManifest = await getClientManifest();
  return (ssrContext) => {
    ssrContext.nuxt = {
      serverRendered: false,
      config: publicConfig
    };
    let entryFiles = Object.values(clientManifest).filter((fileValue) => fileValue.isEntry);
    entryFiles.push(...entryFiles.flatMap((e) => e.dynamicImports || []).map((i) => clientManifest[i]).filter(Boolean));
    if ("all" in clientManifest && "initial" in clientManifest) {
      entryFiles = clientManifest.initial.map((file) => ({ file }));
    }
    return {
      html: '<div id="__nuxt"></div>',
      renderResourceHints: () => "",
      renderStyles: () => entryFiles.flatMap(({ css }) => css).filter((css) => css != null).map((file) => `<link rel="stylesheet" href="${buildAssetsURL(file)}">`).join(""),
      renderScripts: () => entryFiles.map(({ file }) => {
        const isMJS = !file.endsWith(".js");
        return `<script ${isMJS ? 'type="module"' : ""} src="${buildAssetsURL(file)}"><\/script>`;
      }).join("")
    };
  };
});
function renderToString$1(ssrContext) {
  const getRenderer = ssrContext.noSSR ? getSPARenderer : getSSRRenderer;
  return getRenderer().then((renderToString2) => renderToString2(ssrContext));
}
async function renderMiddleware(req, res) {
  let url = req.url;
  let isPayloadReq = false;
  if (url.startsWith(STATIC_ASSETS_BASE) && url.endsWith(PAYLOAD_JS)) {
    isPayloadReq = true;
    url = url.slice(STATIC_ASSETS_BASE.length, url.length - PAYLOAD_JS.length) || "/";
  }
  const ssrContext = {
    url,
    req,
    res,
    runtimeConfig: { private: privateConfig, public: publicConfig },
    noSSR: req.spa || req.headers["x-nuxt-no-ssr"],
    ...req.context || {}
  };
  const rendered = await renderToString$1(ssrContext);
  if (ssrContext.error) {
    throw ssrContext.error;
  }
  if (ssrContext.redirected || res.writableEnded) {
    return;
  }
  if (ssrContext.nuxt.hooks) {
    await ssrContext.nuxt.hooks.callHook("app:rendered");
  }
  const payload = ssrContext.payload || ssrContext.nuxt;
  let data;
  if (isPayloadReq) {
    data = renderPayload(payload, url);
    res.setHeader("Content-Type", "text/javascript;charset=UTF-8");
  } else {
    data = await renderHTML(payload, rendered, ssrContext);
    res.setHeader("Content-Type", "text/html;charset=UTF-8");
  }
  const error = ssrContext.nuxt && ssrContext.nuxt.error;
  res.statusCode = error ? error.statusCode : 200;
  res.end(data, "utf-8");
}
async function renderHTML(payload, rendered, ssrContext) {
  const state = `<script>window.__NUXT__=${devalue(payload)}<\/script>`;
  const html = rendered.html;
  if ("renderMeta" in ssrContext) {
    rendered.meta = await ssrContext.renderMeta();
  }
  const {
    htmlAttrs = "",
    bodyAttrs = "",
    headAttrs = "",
    headTags = "",
    bodyScriptsPrepend = "",
    bodyScripts = ""
  } = rendered.meta || {};
  return htmlTemplate({
    HTML_ATTRS: htmlAttrs,
    HEAD_ATTRS: headAttrs,
    HEAD: headTags + rendered.renderResourceHints() + rendered.renderStyles() + (ssrContext.styles || ""),
    BODY_ATTRS: bodyAttrs,
    APP: bodyScriptsPrepend + html + state + rendered.renderScripts() + bodyScripts
  });
}
function renderPayload(payload, url) {
  return `__NUXT_JSONP__("${url}", ${devalue(payload)})`;
}
function _interopDefault(e) {
  return e && typeof e === "object" && "default" in e ? e.default : e;
}
function cachedImport(importer) {
  return cachedResult(() => importer().then(_interopDefault));
}
function cachedResult(fn) {
  let res = null;
  return () => {
    if (res === null) {
      res = fn().catch((err) => {
        res = null;
        throw err;
      });
    }
    return res;
  };
}

const render = /*#__PURE__*/Object.freeze({
  __proto__: null,
  renderMiddleware: renderMiddleware
});

const renderToString = (...args) => {
  return renderToString$2(...args).then((result) => `<div id="__nuxt">${result}</div>`);
};

const vue3 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  renderToString: renderToString
});
//# sourceMappingURL=index.mjs.map
