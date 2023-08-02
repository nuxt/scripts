import { defineEventHandler, getQuery, setHeader, sendError, createError } from 'h3'
import {useCachedScript} from "../util";
import { createConsola } from 'consola'

export default defineEventHandler(async (e) => {
    let { src, ttl, purge, integrity } = getQuery(e)

    if (typeof src !== 'string')
        return

    src = decodeURIComponent(src)
    integrity = decodeURIComponent(integrity as string)

    const { script, cacheResult, cacheExpires } = await useCachedScript(src,
        {
            ttl: Number(ttl),
            purge: Boolean(purge)
        }
    )

    if (!script) {
        // error
        const error = createError({
            status: 400,
            statusText: `The script ${src} was not found.`,
        })
        return sendError(e, error)
    }

    const logger = createConsola()

    if (typeof integrity === 'string') {
        if (script.integrity !== integrity) {
            logger.warn(`The expected integrity was ${integrity}, received ${script?.integrity}.\`.`)
            // TODO maybe throw error
            // const error = createError({
            //     status: 400,
            //     statusText: `The expected integrity was ${integrity}, received ${script?.integrity}.`,
            // })
            // return sendError(e, error)
        }
    } else if (process.dev) {
        // highlight the integrity code
        const greenColor = '\x1b[32m'
        const resetColor = '\x1b[0m'
        const warnBg = '\x1b[43m'
        const warnFg = '\x1b[30m'
        logger.warn(`${warnBg}${warnFg}WARN${resetColor} You are using a third-party script \`${src}\` without an integrity check. This is not recommended.`)
        logger.warn(`To fix this, add the following code to your useScript:`)
        logger.warn('')
        logger.warn(`\n{ integrity: ${greenColor}'${script?.integrity}'${resetColor} }`)
    }

    setHeader(e, 'x-nuxt-script-proxy-cache', cacheResult)
    setHeader(e, 'x-nuxt-script-proxy-cache-ttl', cacheExpires.toString())
    // json
    setHeader(e, 'content-type', 'application/json; charset=utf-8')
    return script
})
