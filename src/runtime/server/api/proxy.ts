import { defineEventHandler, getQuery, setHeader, proxyRequest } from 'h3'
import { useCachedScript } from "../util";

export default defineEventHandler(async (e) => {
    // eslint-disable-next-line prefer-const
    let { src, ttl, purge } = getQuery(e)

    if (typeof src !== 'string')
        return

    src = decodeURIComponent(src)

    const cachedScript = await useCachedScript(src,
        {
            ttl: Number(ttl),
            purge: Boolean(purge)
        }
    )

    if (!cachedScript || !cachedScript.script) {
        return proxyRequest(e, src)
    }

    const { script, cacheResult, cacheExpires, ttl: _ttl } = cachedScript

    setHeader(e, 'x-nuxt-script-proxy-cache', cacheResult)
    setHeader(e, 'x-nuxt-script-proxy-cache-ttl', cacheExpires.toString())
    setHeader(e, 'content-type', 'text/javascript; charset=utf-8')
    setHeader(e, 'cache-control', `public, max-age=${_ttl}, must-revalidate`)
    return script.innerHTML
})
