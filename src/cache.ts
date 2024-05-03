import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs'

type Awaitable<T> = T | PromiseLike<T>

// TODO: refactor to use nitro storage when possible
const storage = createStorage({
  driver: fsDriver({
    base: 'node_modules/.cache/nuxt/scripts/meta',
  }),
})

export async function cachedData<T = unknown>(key: string, fetcher: () => Awaitable<T>, options?: {
  onError?: (err: any) => Awaitable<T>
  ttl?: number
}) {
  const cached = await storage.getItem<null | { expires: number, data: T }>(key)
  if (!cached || cached.expires < Date.now()) {
    try {
      const data = await fetcher()
      await storage.setItem(key, { expires: Date.now() + (options?.ttl || 1000 * 60 * 60 * 24 * 7), data })
      return data
    }
    catch (err) {
      if (options?.onError)
        return options.onError(err)
      throw err
    }
  }
  return cached.data
}
