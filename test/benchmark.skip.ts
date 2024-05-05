import { describe, expect, it } from 'vitest'
import { createUnlighthouse } from 'unlighthouse'

async function benchmarkBetween(urls: string[]) {
  const { worker, hooks, setCiContext, start } = await createUnlighthouse({
    site: 'https://scripts-phi.vercel.app',
    urls,
    lighthouseOptions: {
      onlyCategories: ['performance'],
    },
    puppeteerOptions: {
      timeout: 120_000,
    },
    scanner: {
      device: 'mobile',
      throttle: true,
      samples: 1,
    },
    cache: false,
  }, { name: 'ci' })
  await setCiContext()

  await start()
  await new Promise<void>((resolve) => {
    hooks.hook('worker-finished', resolve)
  })
  return worker.reports().map((report) => {
    const tti = report.report?.audits.interactive.numericValue
    const tbt = report.report?.audits['total-blocking-time'].numericValue
    const fcp = report.report?.audits['first-contentful-paint'].numericValue
    // extract web vitals
    return {
      tti,
      tbt,
      fcp,
      score: report.report?.categories[0].score,
      url: report.route.url,
    }
  })
}

describe('benchmarks', () => {
  it('unlighthouse', async () => {
    const reports = await benchmarkBetween([
      '/third-parties/google-analytics/unhead',
      '/third-parties/google-analytics/nuxt-scripts',
      '/third-parties/youtube/default',
      '/third-parties/youtube/nuxt-scripts',
      '/third-parties/vimeo/default',
      '/third-parties/vimeo/nuxt-scripts',
    ])
    // compute difference
    expect(reports).toMatchInlineSnapshot(`
      [
        {
          "fcp": 1369.258,
          "score": 1,
          "tbt": 0,
          "tti": 1369.2580000000003,
          "url": "https://scripts-phi.vercel.app/third-parties/google-analytics/nuxt-scripts",
        },
        {
          "fcp": 1371.0955,
          "score": 1,
          "tbt": 0,
          "tti": 1371.0955,
          "url": "https://scripts-phi.vercel.app/third-parties/google-analytics/unhead",
        },
        {
          "fcp": 1520.4070000000002,
          "score": 1,
          "tbt": 0,
          "tti": 1520.4070000000002,
          "url": "https://scripts-phi.vercel.app/third-parties/vimeo/default",
        },
        {
          "fcp": 916.077,
          "score": 0.99,
          "tbt": 0,
          "tti": 916.077,
          "url": "https://scripts-phi.vercel.app/third-parties/vimeo/nuxt-scripts",
        },
        {
          "fcp": 1018.7709999999998,
          "score": 1,
          "tbt": 0,
          "tti": 1018.771,
          "url": "https://scripts-phi.vercel.app/third-parties/youtube/default",
        },
        {
          "fcp": 1056.373,
          "score": 0.99,
          "tbt": 0,
          "tti": 1056.373,
          "url": "https://scripts-phi.vercel.app/third-parties/youtube/nuxt-scripts",
        },
      ]
    `)
  }, 100_000)
})
