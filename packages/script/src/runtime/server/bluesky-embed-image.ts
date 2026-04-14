import { createImageProxyHandler } from './utils/image-proxy'

export default createImageProxyHandler({
  allowedDomains: [
    'cdn.bsky.app',
    'av-cdn.bsky.app',
  ],
})
