import { withQuery } from 'ufo'
import { useScript } from '#imports'

export function useGoogleAdsense(options?: { id: string }) {
  useScript({
    key: 'adsbygoogle',
    defer: true,
    crossorigin: 'anonymous',
    src: withQuery(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js`, { client: options.id }),
  })
}
