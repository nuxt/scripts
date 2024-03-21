export async function getScriptSize(url: string) {
  const compressedResponse = await fetch(url, { headers: { 'Accept-Encoding': 'gzip' } })
  return bytesToSize(await getResponseSize(compressedResponse))
}

async function getResponseSize(response) {
  const reader = response.body.getReader()
  const contentLength = +response.headers.get('Content-Length')

  if (contentLength) {
    return contentLength
  }
  else {
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done)
        return total
      total += value.length
    }
  }
}

function bytesToSize(bytes: number) {
  // be precise to 2 decimal places
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0)
    return '0 Byte'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${Number.parseFloat((bytes / 1024 ** i).toFixed(2))} ${sizes[i]}`
}
