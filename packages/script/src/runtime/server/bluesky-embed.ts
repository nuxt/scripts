import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { $fetch } from 'ofetch'

interface PostThreadResponse {
  thread: {
    $type: string
    post: {
      uri: string
      cid: string
      author: Record<string, any>
      record: Record<string, any>
      embed?: Record<string, any>
      likeCount: number
      repostCount: number
      replyCount: number
      quoteCount: number
      indexedAt: string
      labels: Array<{ val: string }>
    }
  }
}

const BSKY_POST_URL_RE = /^https:\/\/bsky\.app\/profile\/([^/]+)\/post\/([^/?]+)$/

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const postUrl = query.url as string

  if (!postUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Post URL is required',
    })
  }

  const match = postUrl.match(BSKY_POST_URL_RE)
  if (!match) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Bluesky post URL',
    })
  }

  const [, actor, rkey] = match as RegExpMatchArray

  // Resolve handle to DID if needed
  let did = actor!
  if (!actor!.startsWith('did:')) {
    const profile = await $fetch<{ did: string }>(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor!)}`,
    ).catch((error: any) => {
      throw createError({
        statusCode: error.statusCode || 500,
        statusMessage: 'Failed to resolve Bluesky handle',
      })
    })
    did = profile.did
  }

  const uri = `at://${did}/app.bsky.feed.post/${rkey}`

  const response = await $fetch<PostThreadResponse>(
    `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}&depth=0&parentHeight=0`,
  ).catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch Bluesky post',
    })
  })

  if (response.thread.$type !== 'app.bsky.feed.defs#threadViewPost') {
    throw createError({
      statusCode: 404,
      statusMessage: 'Post not found',
    })
  }

  const post = response.thread.post

  // Respect author opt-out
  const hasOptOut = post.labels?.some(l => l.val === '!no-unauthenticated')
    || post.author?.labels?.some((l: any) => l.val === '!no-unauthenticated')
  if (hasOptOut) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Author has opted out of external embedding',
    })
  }

  // Cache for 10 minutes
  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Cache-Control', 'public, max-age=600, s-maxage=600')

  return post
})
