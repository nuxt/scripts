export async function fetchScript(url: string) {
  const compressedResponse = await fetch(url, { headers: { 'Accept-Encoding': 'gzip' } }).catch((err) => {
    return {
      size: null,
      error: err,
    }
  })
  if (compressedResponse?.error) {
    return compressedResponse as { size: null, error: Error }
  }
  if (!compressedResponse.ok) {
    return {
      size: null,
      error: new Error(`Failed to fetch ${compressedResponse.status} ${compressedResponse.statusText}`),
    }
  }
  const size = await getResponseSize(compressedResponse)
  if (!size) {
    return {
      size: null,
    }
  }
  return {
    size: bytesToSize(size),
  }
}

async function getResponseSize(response: Response) {
  const reader = response.body?.getReader()
  const contentLength = response.headers.get('Content-Length')

  if (contentLength) {
    return Number(contentLength)
  }
  if (!reader) {
    return null
  }
  let total = 0
  let done = false
  while (!done) {
    const data = await reader.read()
    done = data.done
    total += data.value?.length || 0
  }
  return total > 0 ? total : null
}

function bytesToSize(bytes: number) {
  // be precise to 2 decimal places
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0)
    return '0 Byte'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${Number.parseFloat((bytes / 1024 ** i).toFixed(2))} ${sizes[i]}`
}
