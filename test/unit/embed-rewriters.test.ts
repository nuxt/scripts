import { describe, expect, it } from 'vitest'
import {
  rewriteBlueskyPostImages,
  rewriteTweetImages,
} from '../../packages/script/src/runtime/server/utils/embed-rewriters'
import { SIG_PARAM } from '../../packages/script/src/runtime/server/utils/sign-constants'

const SECRET = 'test-secret-deterministic'
const X_PATH = '/_scripts/embed/x-image'
const BSKY_PATH = '/_scripts/embed/bluesky-image'

function makeTweet(overrides: Record<string, any> = {}) {
  return {
    id_str: '1',
    text: 'hi',
    created_at: '2024-01-01T00:00:00Z',
    favorite_count: 0,
    conversation_count: 0,
    user: {
      name: 'Alice',
      screen_name: 'alice',
      profile_image_url_https: 'https://pbs.twimg.com/profile_images/1/avatar.jpg',
    },
    ...overrides,
  }
}

describe('rewriteTweetImages (unsigned)', () => {
  it('rewrites the user avatar URL', () => {
    const tweet = makeTweet()
    rewriteTweetImages(tweet, X_PATH)
    expect(tweet.user.profile_image_url_https).toBe(
      `${X_PATH}?url=${encodeURIComponent('https://pbs.twimg.com/profile_images/1/avatar.jpg')}`,
    )
  })

  it('rewrites every photo url', () => {
    const tweet = makeTweet({
      photos: [
        { url: 'https://pbs.twimg.com/media/a.jpg', width: 1, height: 1 },
        { url: 'https://pbs.twimg.com/media/b.jpg', width: 2, height: 2 },
      ],
    })
    rewriteTweetImages(tweet, X_PATH)
    expect(tweet.photos[0].url).toContain(encodeURIComponent('https://pbs.twimg.com/media/a.jpg'))
    expect(tweet.photos[1].url).toContain(encodeURIComponent('https://pbs.twimg.com/media/b.jpg'))
  })

  it('rewrites entities.media urls', () => {
    const tweet = makeTweet({
      entities: {
        media: [{ media_url_https: 'https://pbs.twimg.com/media/m.jpg', type: 'photo', sizes: {} }],
      },
    })
    rewriteTweetImages(tweet, X_PATH)
    expect(tweet.entities.media[0].media_url_https).toContain(encodeURIComponent('https://pbs.twimg.com/media/m.jpg'))
  })

  it('rewrites video poster', () => {
    const tweet = makeTweet({
      video: { poster: 'https://pbs.twimg.com/media/poster.jpg', variants: [] },
    })
    rewriteTweetImages(tweet, X_PATH)
    expect(tweet.video.poster).toContain(encodeURIComponent('https://pbs.twimg.com/media/poster.jpg'))
  })

  it('recurses into quoted tweets', () => {
    const tweet = makeTweet({
      quoted_tweet: makeTweet({
        user: {
          name: 'Bob',
          screen_name: 'bob',
          profile_image_url_https: 'https://pbs.twimg.com/profile_images/2/q.jpg',
        },
      }),
    })
    rewriteTweetImages(tweet, X_PATH)
    expect(tweet.quoted_tweet.user.profile_image_url_https).toContain(encodeURIComponent('https://pbs.twimg.com/profile_images/2/q.jpg'))
    expect(tweet.quoted_tweet.user.profile_image_url_https).toContain(X_PATH)
  })

  it('is a no-op on null/undefined', () => {
    expect(() => rewriteTweetImages(null, X_PATH)).not.toThrow()
    expect(() => rewriteTweetImages(undefined, X_PATH)).not.toThrow()
  })

  it('skips missing fields without error', () => {
    const tweet = { id_str: '1', user: {} }
    expect(() => rewriteTweetImages(tweet, X_PATH)).not.toThrow()
    expect(tweet.user).toEqual({})
  })
})

describe('rewriteTweetImages (signed)', () => {
  it('appends sig= on every rewritten URL when a secret is provided', () => {
    const tweet = makeTweet({
      photos: [{ url: 'https://pbs.twimg.com/media/a.jpg', width: 1, height: 1 }],
      video: { poster: 'https://pbs.twimg.com/media/p.jpg', variants: [] },
      quoted_tweet: makeTweet({
        user: {
          name: 'Bob',
          screen_name: 'bob',
          profile_image_url_https: 'https://pbs.twimg.com/profile_images/2/q.jpg',
        },
      }),
    })
    rewriteTweetImages(tweet, X_PATH, SECRET)
    for (const url of [
      tweet.user.profile_image_url_https,
      tweet.photos[0].url,
      tweet.video.poster,
      tweet.quoted_tweet.user.profile_image_url_https,
    ]) {
      expect(url).toMatch(new RegExp(`${SIG_PARAM}=[a-f0-9]{16}`))
    }
  })

  it('produces deterministic URLs for the same input + secret', () => {
    const a = makeTweet()
    const b = makeTweet()
    rewriteTweetImages(a, X_PATH, SECRET)
    rewriteTweetImages(b, X_PATH, SECRET)
    expect(a.user.profile_image_url_https).toBe(b.user.profile_image_url_https)
  })

  it('produces different signatures for different secrets', () => {
    const a = makeTweet()
    const b = makeTweet()
    rewriteTweetImages(a, X_PATH, SECRET)
    rewriteTweetImages(b, X_PATH, `${SECRET}-other`)
    expect(a.user.profile_image_url_https).not.toBe(b.user.profile_image_url_https)
  })
})

describe('rewriteBlueskyPostImages', () => {
  it('rewrites the author avatar', () => {
    const post = {
      author: { avatar: 'https://cdn.bsky.app/img/avatar.jpg' },
    }
    rewriteBlueskyPostImages(post, BSKY_PATH)
    expect(post.author.avatar).toContain(encodeURIComponent('https://cdn.bsky.app/img/avatar.jpg'))
    expect(post.author.avatar).toContain(BSKY_PATH)
  })

  it('rewrites thumb + fullsize on embedded images', () => {
    const post = {
      embed: {
        images: [
          {
            thumb: 'https://cdn.bsky.app/img/thumb-a.jpg',
            fullsize: 'https://cdn.bsky.app/img/full-a.jpg',
          },
          {
            thumb: 'https://cdn.bsky.app/img/thumb-b.jpg',
            fullsize: 'https://cdn.bsky.app/img/full-b.jpg',
          },
        ],
      },
    }
    rewriteBlueskyPostImages(post, BSKY_PATH)
    for (const image of post.embed.images) {
      expect(image.thumb).toContain(BSKY_PATH)
      expect(image.fullsize).toContain(BSKY_PATH)
    }
  })

  it('rewrites external embed thumbnails', () => {
    const post = {
      embed: {
        external: {
          uri: 'https://example.com',
          title: 't',
          description: 'd',
          thumb: 'https://cdn.bsky.app/img/ext-thumb.jpg',
        },
      },
    }
    rewriteBlueskyPostImages(post, BSKY_PATH)
    expect(post.embed.external.thumb).toContain(encodeURIComponent('https://cdn.bsky.app/img/ext-thumb.jpg'))
  })

  it('signs URLs when a secret is provided', () => {
    const post = {
      author: { avatar: 'https://cdn.bsky.app/img/avatar.jpg' },
      embed: {
        images: [{ thumb: 'https://cdn.bsky.app/img/t.jpg', fullsize: 'https://cdn.bsky.app/img/f.jpg' }],
      },
    }
    rewriteBlueskyPostImages(post, BSKY_PATH, SECRET)
    expect(post.author.avatar).toMatch(new RegExp(`${SIG_PARAM}=[a-f0-9]{16}`))
    expect(post.embed.images[0].thumb).toMatch(new RegExp(`${SIG_PARAM}=[a-f0-9]{16}`))
    expect(post.embed.images[0].fullsize).toMatch(new RegExp(`${SIG_PARAM}=[a-f0-9]{16}`))
  })

  it('is a no-op on null/undefined', () => {
    expect(() => rewriteBlueskyPostImages(null, BSKY_PATH)).not.toThrow()
    expect(() => rewriteBlueskyPostImages(undefined, BSKY_PATH)).not.toThrow()
  })

  it('handles missing embed / author fields', () => {
    const post = {}
    expect(() => rewriteBlueskyPostImages(post, BSKY_PATH)).not.toThrow()
  })

  it('does not rewrite fields that are absent', () => {
    const post = { author: {}, embed: { external: { uri: 'x' } } }
    rewriteBlueskyPostImages(post, BSKY_PATH)
    expect((post.author as any).avatar).toBeUndefined()
    expect((post.embed as any).external.thumb).toBeUndefined()
  })
})
