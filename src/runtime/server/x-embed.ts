import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { $fetch } from 'ofetch'

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

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const tweetId = query.id as string

  if (!tweetId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tweet ID is required',
    })
  }

  // Generate random token like Zaraz does
  const randomToken = [...Array(11)]
    .map(() => (Math.random() * 36).toString(36)[2])
    .join('')

  const tweetData = await $fetch<TweetData>(
    `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=${randomToken}`,
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

  // Cache for 10 minutes
  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Cache-Control', 'public, max-age=600, s-maxage=600')

  return tweetData
})
