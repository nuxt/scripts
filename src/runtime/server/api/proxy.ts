import { defineEventHandler, getQuery, setHeader, proxyRequest } from 'h3'
import {useCachedScript} from "../util";

export default defineEventHandler(async (e) => {
    let { src, ttl, purge } = getQuery(e)

    if (typeof src !== 'string')
        return

    src = decodeURIComponent(src)

    const { script, cacheResult, cacheExpires, ttl: _ttl } = await useCachedScript(src,
        {
            ttl: Number(ttl),
            purge: Boolean(purge)
        }
    )

    if (!script) {
        return proxyRequest(e, src)
    }

    setHeader(e, 'x-nuxt-script-proxy-cache', cacheResult)
    setHeader(e, 'x-nuxt-script-proxy-cache-ttl', cacheExpires.toString())
    setHeader(e, 'content-type', 'text/javascript; charset=utf-8')
    setHeader(e, 'cache-control', `public, max-age=${_ttl}, must-revalidate`)
    return script.innerHTML
})
