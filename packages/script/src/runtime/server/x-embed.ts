import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { createCachedJsonFetch } from './utils/cached-upstream'
import { rewriteTweetImages } from './utils/embed-rewriters'
import { withSigning } from './utils/withSigning'

interface TweetData {
  id_str: string
  text: string
  created_at: string
  favorite_count: number
  conversation_count: number
  user: {
    name: string
    screen_name: string
    profile_image_url_https: string
    verified?: boolean
    is_blue_verified?: boolean
  }
  entities?: {
    media?: Array<{
      media_url_https: string
      type: string
      sizes: Record<string, { w: number, h: number }>
    }>
    urls?: Array<{
      url: string
      expanded_url: string
      display_url: string
    }>
  }
  photos?: Array<{
    url: string
    width: number
    height: number
  }>
  video?: {
    poster: string
    variants: Array<{ type: string, src: string }>
  }
  quoted_tweet?: TweetData
  parent?: {
    user: {
      screen_name: string
    }
  }
}

const TWEET_ID_RE = /^\d+$/
const EMBED_X_SUFFIX_RE = /\/embed\/x$/
const TWEET_ID_FROM_URL_RE = /[?&]id=(\d+)/

// Tweet data is semi-fresh; 10 minutes matches the Cache-Control already sent
// to CDNs and dedupes the syndication CDN hit when the same tweet is embedded
// on multiple pages.
const cachedTweetFetch = createCachedJsonFetch<TweetData>(
  'nuxt-scripts-x-tweet',
  600,
  (url) => {
    // Syndication URL includes a random anti-cache token per request; key on
    // the tweet ID only so renders dedupe.
    const match = url.match(TWEET_ID_FROM_URL_RE)
    return match?.[1] || url
  },
)

export default withSigning(defineEventHandler(async (event) => {
  const query = getQuery(event)
  const tweetId = query.id as string

  if (!tweetId || !TWEET_ID_RE.test(tweetId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid Tweet ID is required',
    })
  }

  // Generate random token like Zaraz does
  const randomToken = Array.from(Array.from({ length: 11 }), () => (Math.random() * 36).toString(36)[2])
    .join('')

  const params = new URLSearchParams({ id: tweetId, token: randomToken })
  const tweetRaw = await cachedTweetFetch(
    `https://cdn.syndication.twimg.com/tweet-result?${params.toString()}`,
    {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      },
    },
  ).catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch tweet',
    })
  })

  // Rewrite raw CDN image URLs to proxied (and, when signing is enabled,
  // HMAC-signed) URLs so the client can load them through the site origin
  // without triggering the `withSigning` 403. Clone first — the cached tweet
  // is a shared reference under the memory driver and mutation would corrupt
  // subsequent cache hits.
  const tweetData = structuredClone(tweetRaw) as TweetData
  const handlerPath = event.path?.split('?')[0] || ''
  const prefix = handlerPath.replace(EMBED_X_SUFFIX_RE, '') || '/_scripts'
  const imagePath = `${prefix}/embed/x-image`
  const secret = (useRuntimeConfig(event)['nuxt-scripts'] as { proxySecret?: string } | undefined)?.proxySecret
  rewriteTweetImages(tweetData, imagePath, secret)

  // Cache for 10 minutes
  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Cache-Control', 'public, max-age=600, s-maxage=600')

  return tweetData
}))
