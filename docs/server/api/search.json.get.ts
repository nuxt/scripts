import { defineEventHandler } from 'h3'
// @ts-expect-error untyped
import { serverQueryContent } from '#content/server'

export default defineEventHandler(async (event) => {
  return serverQueryContent(event).where({ _type: 'markdown', navigation: { $ne: false } }).find()
})
