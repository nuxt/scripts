import { joinURL, withBase, withQuery } from 'ufo'
import {
  GoogleAnalytics,
  GoogleTagManager,
} from 'third-party-capital'
import type { HotjarInput } from './runtime/registry/hotjar'
import type { IntercomInput } from './runtime/registry/intercom'
import type { SegmentInput } from './runtime/registry/segment'
import type { NpmInput } from './runtime/registry/npm'
import type { PlausibleAnalyticsInput } from './runtime/registry/plausible-analytics'
import type { RegistryScripts } from './runtime/types'
import type { GoogleAdsenseInput } from './runtime/registry/google-adsense'
import type { ClarityInput } from './runtime/registry/clarity'

// avoid nuxt/kit dependency here so we can use in docs

export const registry: (resolve?: (s: string) => string) => RegistryScripts = (resolve?: (s: string) => string) => {
  resolve = resolve || ((s: string) => s)

  return [
    {
      label: 'Plausible Analytics',
      category: 'analytics',
      scriptBundling: (options?: PlausibleAnalyticsInput) => {
        const extensions = Array.isArray(options?.extension) ? options.extension.join('.') : [options?.extension]
        return options?.extension ? `https://plausible.io/js/script.${extensions}.js` : 'https://plausible.io/js/script.js'
      },
      logo: `<svg height="32" id="Layer_2" viewBox="0 0 46 60" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><linearGradient id="New_Gradient_Swatch_1" x1="14.841" y1="22.544" x2="27.473" y2="44.649" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#909cf7"/><stop offset="1" stop-color="#4b38d8"/></linearGradient><linearGradient id="New_Gradient_Swatch_1-2" x1="7.984" y1="-1.358" x2="21.001" y2="21.422" xlink:href="#New_Gradient_Swatch_1"/><style>.cls-3{stroke-width:0;fill:#1f2961}</style></defs><g id="Plausible_-_Branding"><g id="Gradient_Logo_-_Purple_Gradient_on_White"><g id="Symbol_-_Purple_Gradient"><path d="M45.246 22.603C44.155 33.059 35.013 40.83 24.5 40.83h-4.047v9.57a9.6 9.6 0 0 1-9.6 9.6H3.36A3.36 3.36 0 0 1 0 56.64V36.938l5.038-7.07a3.362 3.362 0 0 1 4.037-1.149l2.866 1.2a3.353 3.353 0 0 0 4.025-1.145l6.717-9.417a3.34 3.34 0 0 1 4.014-1.14l5.52 2.32a3.347 3.347 0 0 0 4.022-1.142l6.46-9.063c2.025 3.56 3.014 7.789 2.547 12.27Z" style="stroke-width:0;fill:url(#New_Gradient_Swatch_1)"/><path d="M3.292 28.873c.823-1.155 2.021-2.044 3.414-2.312a5.41 5.41 0 0 1 3.147.316l2.865 1.2a1.357 1.357 0 0 0 1.62-.464l6.594-9.245c.823-1.154 2.02-2.041 3.412-2.309a5.368 5.368 0 0 1 3.128.314l5.52 2.32a1.35 1.35 0 0 0 1.619-.46l6.919-9.707C37.827 3.364 31.78 0 24.945 0H3.36A3.36 3.36 0 0 0 0 3.36v30.132l3.292-4.62Z" style="fill:url(#New_Gradient_Swatch_1-2);stroke-width:0"/></g></g></g></svg>`,
      import: {
        name: 'useScriptPlausibleAnalytics',
        from: resolve('./runtime/registry/plausible-analytics'),
      },
    },
    {
      label: 'Cloudflare Web Analytics',
      src: 'https://static.cloudflareinsights.com/beacon.min.js',
      category: 'analytics',
      logo: `<svg xmlns="http://www.w3.org/2000/svg" width="70.02" height="32" viewBox="0 0 256 117"><path fill="#FBAD41" d="M205.52 50.813c-.858 0-1.705.03-2.551.058c-.137.007-.272.04-.398.094a1.424 1.424 0 0 0-.92.994l-3.628 12.672c-1.565 5.449-.983 10.48 1.646 14.174c2.41 3.416 6.42 5.421 11.289 5.655l19.679 1.194c.585.03 1.092.312 1.4.776a1.92 1.92 0 0 1 .2 1.692a2.496 2.496 0 0 1-2.134 1.662l-20.448 1.193c-11.11.515-23.062 9.58-27.255 20.633l-1.474 3.9a1.092 1.092 0 0 0 .967 1.49h70.425a1.872 1.872 0 0 0 1.81-1.365A51.172 51.172 0 0 0 256 101.828c0-28.16-22.582-50.984-50.449-50.984"/><path fill="#F6821F" d="m174.782 115.362l1.303-4.583c1.568-5.449.987-10.48-1.639-14.173c-2.418-3.417-6.424-5.422-11.296-5.656l-92.312-1.193a1.822 1.822 0 0 1-1.459-.776a1.919 1.919 0 0 1-.203-1.693a2.496 2.496 0 0 1 2.154-1.662l93.173-1.193c11.063-.511 23.015-9.58 27.208-20.633l5.313-14.04c.214-.596.27-1.238.156-1.86C191.126 20.51 166.91 0 137.96 0C111.269 0 88.626 17.403 80.5 41.596a26.996 26.996 0 0 0-19.156-5.359C48.549 37.524 38.25 47.946 36.979 60.88a27.905 27.905 0 0 0 .702 9.642C16.773 71.145 0 88.454 0 109.726c0 1.923.137 3.818.413 5.667c.115.897.879 1.57 1.783 1.568h170.48a2.223 2.223 0 0 0 2.106-1.63"/></svg>`,
      import: {
        name: 'useScriptCloudflareWebAnalytics',
        from: resolve('./runtime/registry/cloudflare-web-analytics'),
      },
    },
    {
      label: 'Fathom Analytics',
      scriptBundling: false, // breaks script
      category: 'analytics',
      logo: `<svg width="32" height="32" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><circle cx="512" cy="512" r="512" style="fill:#9187ff"/><path d="M558.62 256c-36.31.16-78.78 10-129.45 28.4-170.71 62.15-206.9 139.74-144.79 310.45s139.73 206.89 310.45 144.76S801.74 599.88 739.6 429.16c-43.69-120-95-173.55-181-173.17zm59.1 140.16h26.73a5.33 5.33 0 0 1 5.16 6.72l-59.26 220.48a5.34 5.34 0 0 1-5.15 4h-26.75a5.33 5.33 0 0 1-5.16-6.72l3.6-13.4 2.63-9.75 53-197.38a5.33 5.33 0 0 1 5.14-3.94zM421.79 413.4h10.75a5.33 5.33 0 0 1 5.33 5.33v18a5.33 5.33 0 0 1-5.33 5.33h-9.13a36.76 36.76 0 0 0-5.51.24 4.7 4.7 0 0 0-2.56 1 4.19 4.19 0 0 0-1 1.66 18.91 18.91 0 0 0-.92 6.72v13.67h19.16a5.33 5.33 0 0 1 5.33 5.33v18a5.34 5.34 0 0 1-5.33 5.33h-19.21v108.71a5.34 5.34 0 0 1-5.34 5.34H387a5.33 5.33 0 0 1-5.33-5.34V448.48a36.74 36.74 0 0 1 3.6-16.64 29.76 29.76 0 0 1 9.73-11.16c7.9-5.48 17.62-7.27 26.82-7.31zm82.14 50c16.37 0 30.27 4.65 40.17 13.27s15.47 21.21 15.42 35.59v35.91l-16.11 59.92h-10.24a5.33 5.33 0 0 1-5.33-5.34v-4a39.13 39.13 0 0 1-4.76 3.56c-7.14 4.55-16.85 7.51-29.65 7.51a62.65 62.65 0 0 1-28.52-6.18 40.49 40.49 0 0 1-18.84-19.35 46.81 46.81 0 0 1-4-19.54 40.72 40.72 0 0 1 5.23-21.12 36.78 36.78 0 0 1 13.78-13.18c11.09-6.25 24.75-8.45 38.14-10.24 7.3-1 13.14-1.61 17.64-2.2a42 42 0 0 0 9.2-1.88 3.16 3.16 0 0 0 1.39-.86l.24-.48a6.77 6.77 0 0 0 .16-1.84v-.73a17.24 17.24 0 0 0-5.85-13.6c-3.8-3.31-9.77-5.55-18.07-5.57s-14.64 2.26-19 5.59a17.51 17.51 0 0 0-7.21 12.54 5.33 5.33 0 0 1-5.31 4.86h-22.25a5.33 5.33 0 0 1-5.33-5.57 45.64 45.64 0 0 1 17.6-34c10.47-8.34 24.85-13.12 41.49-13.12zm23.92 80.71c-1.92.48-4 1-6.31 1.45-6.47 1.28-14.29 2.41-21.87 3.48a61 61 0 0 0-14.76 3.65c-4.18 1.75-7.1 4-8.68 6.57a12.12 12.12 0 0 0-1.71 6.54v.2a12.93 12.93 0 0 0 1.32 5.87 11.81 11.81 0 0 0 3.76 4.22c3.41 2.45 9.13 4.14 16.85 4.14 11.95 0 19.52-3.5 24.32-8.32s7-11.56 7.08-19.11v-8.65zm0 0" style="fill:#fff"/></svg>`,
      import: {
        name: 'useScriptFathomAnalytics',
        from: resolve('./runtime/registry/fathom-analytics'),
      },
    },
    {
      label: 'Matomo Analytics',
      scriptBundling: false, // breaks script
      category: 'analytics',
      logo: `<svg xmlns="http://www.w3.org/2000/svg" width="56.5" height="32" viewBox="0 0 256 145"><defs><path id="logosMatomoIcon0" d="m105.426 70.887l.035-.021l-.663-1.01c-.1-.153-.2-.313-.303-.46L58.935 0L0 43.91l43.078 66.305c.185.281.36.566.55.847l.229.35l.025-.016c6.676 9.471 17.678 15.673 30.144 15.673c20.373 0 36.889-16.513 36.889-36.89c0-7.083-2.029-13.675-5.489-19.292"/><path id="logosMatomoIcon1" fill="#000" d="M64.549 19.33c0-20.374-16.517-36.89-36.89-36.89S-9.23-1.044-9.23 19.33a36.686 36.686 0 0 0 6.08 20.263c-.003 0-.003 0-.003-.003l-.019.003L-31.179 0h-.04c-6.499-10.524-18.101-17.56-31.376-17.56c-13.275 0-24.877 7.036-31.376 17.56h-.037l-44.61 69.525c6.633-9.8 17.848-16.235 30.57-16.235c13.39 0 25.077 7.158 31.54 17.832h.047l29.15 40.921h.047c6.718 9.1 17.486 15.026 29.663 15.026c12.181 0 22.95-5.927 29.666-15.026h.05l.297-.46a36.949 36.949 0 0 0 2.116-3.312l43.675-68.256v.003A36.747 36.747 0 0 0 64.55 19.33M2.372 46.141c.213.204.435.397.654.594c-.22-.197-.438-.39-.654-.594m3.28 2.745c.243.181.48.369.728.544c-.247-.175-.485-.363-.729-.544m8.096 4.598c.306.128.628.228.94.347c-.312-.12-.634-.22-.94-.347m8.28 2.263c.428.065.853.143 1.287.197c-.434-.054-.856-.132-1.287-.197m9.93.203c.438-.05.869-.135 1.303-.197c-.434.062-.862.147-1.303.197m8.368-2.01c.393-.144.797-.275 1.184-.434c-.387.159-.788.29-1.185.434m8.368-4.326c.313-.216.61-.456.916-.684c-.307.228-.603.465-.916.684m6.258-5.526c.259-.285.528-.563.778-.857c-.25.294-.519.572-.778.857"/><path id="logosMatomoIcon2" fill="#95C748" d="m250.511 88.448l.035-.022l-.663-1.01c-.1-.153-.2-.312-.303-.46L204.02 17.56l-58.935 43.91l43.078 66.305c.185.281.36.566.55.847l.229.35l.025-.016c6.676 9.471 17.678 15.673 30.144 15.673c20.373 0 36.889-16.513 36.889-36.89c0-7.083-2.029-13.675-5.489-19.291"/><filter id="logosMatomoIcon3" width="106.9%" height="109.7%" x="-3.4%" y="-3.5%" filterUnits="objectBoundingBox"><feOffset dy="2" in="SourceAlpha" result="shadowOffsetOuter1"/><feGaussianBlur in="shadowOffsetOuter1" result="shadowBlurOuter1" stdDeviation="2"/><feColorMatrix in="shadowBlurOuter1" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0"/></filter></defs><use href="#logosMatomoIcon2"/><path fill="#35BFC0" d="M73.779 107.74c0-20.374-16.516-36.89-36.89-36.89C16.516 70.85 0 87.366 0 107.74c0 20.376 16.516 36.892 36.89 36.892c20.373 0 36.889-16.52 36.889-36.893"/><path fill="#3253A0" d="M172.744 0c20.373 0 36.89 16.516 36.89 36.89a36.747 36.747 0 0 1-6.346 20.688v-.003l-43.675 68.256a36.949 36.949 0 0 1-2.116 3.313l-.297.46h-.05c-6.717 9.098-17.485 15.025-29.666 15.025c-12.177 0-22.945-5.927-29.663-15.026h-.046l-29.15-40.921h-.047C62.114 78.008 50.427 70.85 37.036 70.85c-12.721 0-23.936 6.436-30.569 16.235l44.61-69.525h.037C57.613 7.036 69.215 0 82.49 0c13.275 0 24.877 7.036 31.376 17.56h.04l28.006 39.593l.02-.003c0 .003 0 .003.002.003a36.684 36.684 0 0 1-6.08-20.264C135.855 16.516 152.372 0 172.745 0"/><use href="#logosMatomoIcon2"/><g transform="translate(145.085 17.56)"><mask id="logosMatomoIcon4" fill="#fff"><use href="#logosMatomoIcon0"/></mask><g mask="url(#logosMatomoIcon4)"><use filter="url(#logosMatomoIcon3)" href="#logosMatomoIcon1"/></g></g><path fill="#F38334" d="M209.487 36.89c0-20.374-16.516-36.89-36.89-36.89c-20.373 0-36.89 16.516-36.89 36.89c0 20.373 16.517 36.889 36.89 36.889c20.374 0 36.89-16.516 36.89-36.89"/><path fill="#3152A0" d="M172.597 73.782c-12.887 0-24.214-6.617-30.81-16.629h-.021L113.759 17.56h-.04C107.22 7.04 95.618.003 82.343.003C69.068.003 57.466 7.04 50.967 17.56h-.037L6.323 87.085c6.63-9.796 17.848-16.232 30.566-16.232c13.39 0 25.08 7.155 31.545 17.829h.047l29.15 40.921h.044c6.72 9.096 17.488 15.029 29.665 15.029c12.178 0 22.946-5.93 29.663-15.029h.05l.297-.462a37.588 37.588 0 0 0 2.12-3.307l43.672-68.256c-6.636 9.774-17.839 16.204-30.545 16.204"/></svg>`,
      import: {
        name: 'useScriptMatomoAnalytics',
        from: resolve('./runtime/registry/matomo-analytics'),
      },
    },
    {
      label: 'Segment',
      scriptBundling: (options?: SegmentInput) => {
        return joinURL('https://cdn.segment.com/analytics.js/v1', options?.writeKey || '', 'analytics.min.js')
      },
      logo: `<svg xmlns="http://www.w3.org/2000/svg" width="30.92" height="32" viewBox="0 0 256 265"><path fill="#4FB58B" d="m233.56 141.927l.17.013l17.892 1.87a4.927 4.927 0 0 1 3.225 1.707l.133.163l-.17.085a4.93 4.93 0 0 1 1.02 3.74a133.272 133.272 0 0 1-41.604 81.083a128.86 128.86 0 0 1-87.629 34.38a127.488 127.488 0 0 1-46.156-8.57l-.802-.312a4.716 4.716 0 0 1-2.686-2.533l-.077-.187a4.891 4.891 0 0 1-.083-3.66l7.062-17.23a4.846 4.846 0 0 1 6.118-2.799l.163.06c36.097 13.939 76.98 6.089 105.349-20.227a104.455 104.455 0 0 0 32.891-63.32a4.93 4.93 0 0 1 5.013-4.27zm-190.08 64.31l.251-.002l.253.002c8.12.093 14.658 6.659 14.746 14.749v.253c0 .084 0 .168-.002.252c-.141 8.284-6.97 14.886-15.254 14.745c-8.284-.141-14.885-6.97-14.745-15.254c.139-8.115 6.695-14.615 14.75-14.745M4.93 147.082h146.316a4.973 4.973 0 0 1 4.928 4.844l.002.171v18.316a4.974 4.974 0 0 1-4.76 5.01l-.17.005H4.93A4.975 4.975 0 0 1 0 170.584v-18.659a4.975 4.975 0 0 1 4.755-4.838zM169.56 7.311a4.974 4.974 0 0 1 2.848 2.635a5.096 5.096 0 0 1 0 3.867l-6.375 16.999a4.845 4.845 0 0 1-6.162 2.974A101.228 101.228 0 0 0 62.13 51.252a105.267 105.267 0 0 0-34.507 54.99a4.93 4.93 0 0 1-4.76 3.698h-1.105L4.25 105.733a4.886 4.886 0 0 1-3.103-2.295h-.085A4.929 4.929 0 0 1 .51 99.57a133.393 133.393 0 0 1 44.41-70.204C79.739.7 127.019-7.666 169.56 7.311m-64.807 73.434H251.07a4.972 4.972 0 0 1 4.922 4.67l.008.174v18.317a4.973 4.973 0 0 1-4.76 5.01l-.17.005H104.754a4.972 4.972 0 0 1-4.886-4.842l-.002-.173V85.759a4.972 4.972 0 0 1 4.715-5.008zm101.572-55.883l.252-.002l.253.002c8.12.093 14.658 6.659 14.746 14.748v.253c0 .085 0 .17-.002.253c-.14 8.284-6.97 14.885-15.254 14.744c-8.284-.14-14.885-6.97-14.744-15.253c.138-8.116 6.694-14.616 14.749-14.745"/></svg>`,
      category: 'tracking',
      import: {
        name: 'useScriptSegment',
        from: resolve('./runtime/registry/segment'),
      },
    },
    {
      label: 'Meta Pixel',
      src: 'https://connect.facebook.net/en_US/fbevents.js',
      category: 'tracking',
      logo: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><path fill="#1877F2" d="M256 128C256 57.308 198.692 0 128 0C57.308 0 0 57.308 0 128c0 63.888 46.808 116.843 108 126.445V165H75.5v-37H108V99.8c0-32.08 19.11-49.8 48.348-49.8C170.352 50 185 52.5 185 52.5V84h-16.14C152.959 84 148 93.867 148 103.99V128h35.5l-5.675 37H148v89.445c61.192-9.602 108-62.556 108-126.445"/><path fill="#FFF" d="m177.825 165l5.675-37H148v-24.01C148 93.866 152.959 84 168.86 84H185V52.5S170.352 50 156.347 50C127.11 50 108 67.72 108 99.8V128H75.5v37H108v89.445A128.959 128.959 0 0 0 128 256a128.9 128.9 0 0 0 20-1.555V165z"/></svg>`,
      import: {
        name: 'useScriptMetaPixel',
        from: resolve('./runtime/registry/meta-pixel'),
      },
    },
    {
      label: 'X Pixel',
      src: 'https://static.ads-twitter.com/uwt.js',
      category: 'tracking',
      logo: {
        dark: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 128 128" fill="white" stroke="white"><path d="M75.916 54.2L122.542 0h-11.05L71.008 47.06L38.672 0H1.376l48.898 71.164L1.376 128h11.05L55.18 78.303L89.328 128h37.296L75.913 54.2ZM60.782 71.79l-4.955-7.086l-39.42-56.386h16.972L65.19 53.824l4.954 7.086l41.353 59.15h-16.97L60.782 71.793Z"/></svg>`,
        light: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 128 128" fill="black" stroke="black"><path d="M75.916 54.2L122.542 0h-11.05L71.008 47.06L38.672 0H1.376l48.898 71.164L1.376 128h11.05L55.18 78.303L89.328 128h37.296L75.913 54.2ZM60.782 71.79l-4.955-7.086l-39.42-56.386h16.972L65.19 53.824l4.954 7.086l41.353 59.15h-16.97L60.782 71.793Z"/></svg>`,
      },
      import: {
        name: 'useScriptXPixel',
        from: resolve('./runtime/registry/x-pixel'),
      },
    },
    // ads
    {
      label: 'Google Adsense',
      scriptBundling: (options?: GoogleAdsenseInput) => {
        return withQuery('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
          client: options?.client,
        })
      },
      category: 'ads',
      logo: `<svg xmlns="http://www.w3.org/2000/svg" width="36.09" height="32" viewBox="0 0 256 227"><path fill="#FBBC04" d="M161.8 62.158c11.581-19.822 4.705-45.154-15.355-56.603C126.376-5.878 100.723.899 89.142 20.72c-.51.888-.99 1.794-1.44 2.715L48.553 90.41a49.41 49.41 0 0 0-2.401 4.112L5.495 164.681l72.65 40.721l40.45-69.566a40.013 40.013 0 0 0 2.402-4.112l39.15-66.983a45.769 45.769 0 0 0 1.654-2.583"/><path fill="#34A853" d="M78.483 205.189c-11.515 20.142-37.49 27.553-57.434 15.931c-19.954-11.63-27.036-36.847-15.513-56.982c11.523-20.134 37.267-27.578 57.22-15.956c19.954 11.63 27.241 36.872 15.727 56.998"/><path fill="#4285F4" d="M235.257 75.417c-19.83-11.429-45.17-4.661-56.661 15.134l-41.478 71.67c-11.428 19.755-4.678 45.033 15.076 56.46l.107.062c19.835 11.433 45.18 4.66 56.67-15.142l41.469-71.663c11.426-19.76 4.67-45.042-15.09-56.468z"/></svg>`,
      import: {
        name: 'useScriptGoogleAdsense',
        from: resolve('./runtime/registry/google-adsense'),
      },
    },
    {
      label: 'Carbon Ads',
      scriptBundling: false,
      category: 'ads',
      logo: `<svg width="85" height="39" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g fill="none" fill-rule="evenodd"><g fill="#27282F" fill-rule="nonzero"><path d="M2.927 17.98c0 3.248 1.225 4.295 4.933 4.295 1.362 0 3.573-.174 5.31-.488l.305 2.584c-1.633.385-4.015.629-5.717.629C2.212 25 0 22.555 0 18.155V7.887c0-4.401 2.212-6.845 7.759-6.845 1.701 0 4.083.244 5.717.628l-.306 2.585c-1.736-.315-3.948-.49-5.309-.49-3.709 0-4.934 1.049-4.934 4.296v9.92ZM27.988 24.65h-2.433l-.172-1.257C23.91 24.441 21.991 25 19.97 25c-3.118 0-4.42-1.886-4.42-4.89 0-3.528 1.748-4.785 5.106-4.785h4.454V12.67c0-2.13-.925-2.864-3.632-2.864-1.61 0-3.701.28-5.003.56l-.309-2.34c1.576-.42 3.7-.734 5.483-.734 4.763 0 6.34 1.886 6.34 5.518v11.84Zm-2.879-6.88H20.86c-1.782 0-2.433.559-2.433 2.27 0 1.747.309 2.445 2.365 2.445 1.439 0 3.05-.56 4.317-1.397V17.77ZM38.354 10.035c-1.497.784-3.221 1.995-4.523 2.993V25h-2.733V7.648h2.375l.162 2.423a19.862 19.862 0 0 1 4.36-2.78l.359 2.744ZM53.902 18.573c0 3.92-1.415 6.427-7.321 6.427-1.592 0-4.174-.213-6.154-.671V.424L43.397 0v8.298c1.203-.636 3.254-1.2 5.447-1.2 3.572 0 5.058 2.083 5.058 5.367v6.108ZM43.398 22.14c1.167.177 2.334.248 3.395.248 3.501 0 4.138-1.413 4.138-3.708v-6.32c0-1.766-.778-2.649-2.794-2.649-1.521 0-3.572.742-4.74 1.307v11.122ZM61.677 25c-4.833 0-6.738-2.83-6.738-6.392v-4.925c0-3.562 1.905-6.391 6.738-6.391 4.832 0 6.738 2.829 6.738 6.391v4.925c0 3.562-1.906 6.392-6.738 6.392Zm0-15.16c-2.586 0-3.88 1.258-3.88 3.738v5.134c0 2.48 1.293 3.738 3.88 3.738 2.586 0 3.88-1.258 3.88-3.738v-5.134c0-2.48-1.293-3.738-3.88-3.738ZM80.495 7.145c-1.92-.344-4.937.512-6.378 1.225l-.273-1.471h-2.32v17.06h2.866V11.066c1.775-.946 4.2-1.725 5.427-1.692.902.024 1.738.746 1.738 1.552v13.031h2.866V10.94c-.458-3.648-3.927-3.832-3.926-3.795Z"/></g><image opacity=".3" x="31" y="28" width="54" height="10" xlink:href="data:image/png;base64,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"/></g></svg>`,
    },
    // marketing
    {
      label: 'Intercom',
      scriptBundling(options?: IntercomInput) {
        return joinURL(`https://widget.intercom.io/widget`, options?.app_id || '')
      },
      logo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8.968 8.972"><path d="M7.853 0h-6.73C.496 0-.002.498-.002 1.117v6.73a1.12 1.12 0 0 0 1.126 1.126h6.73c.618 0 1.117-.498 1.117-1.117v-6.73A1.119 1.119 0 0 0 7.853 0zM5.68 1.645c0-.17.13-.3.3-.3s.3.13.3.3v3.998c0 .17-.13.3-.3.3s-.3-.13-.3-.3zm-1.495-.15c0-.17.13-.3.3-.3s.3.13.3.3v4.336c0 .17-.13.3-.3.3s-.3-.13-.3-.3zm-1.495.15c0-.17.13-.3.3-.3s.3.13.3.3v3.998c0 .17-.13.3-.3.3s-.3-.13-.3-.3zm-1.495.598c0-.17.13-.3.3-.3s.3.13.3.3v2.692c0 .17-.13.3-.3.3s-.3-.13-.3-.3zm6.48 4.566c-.05.04-1.156.967-3.2.967s-3.14-.927-3.2-.967a.29.29 0 0 1-.03-.419.29.29 0 0 1 .419-.03c.02 0 1.007.817 2.8.817 1.814 0 2.79-.817 2.79-.827.13-.1.32-.1.42.03a.3.3 0 0 1-.02.429zm.1-1.874c0 .17-.13.3-.3.3s-.3-.13-.3-.3V2.243c0-.17.13-.3.3-.3s.3.13.3.3z" fill="#1f8ded"/></svg>`,
      category: 'support',
      import: {
        name: 'useScriptIntercom',
        from: resolve('./runtime/registry/intercom'),
      },
    },
    {
      label: 'Hotjar',
      scriptBundling(options?: HotjarInput) {
        return withQuery(`https://static.hotjar.com/c/hotjar-${options?.id || ''}.js`, {
          sv: options?.sv || '6',
        })
      },
      logo: `<svg xmlns="http://www.w3.org/2000/svg" width="28.45" height="32" viewBox="0 0 256 288"><path fill="#FF3C00" d="M256 100.585c0 53.068-23.654 81.018-49.308 99.403l-4.984 3.443l-5 3.23l-4.979 3.04l-4.925 2.877l-18.623 10.45c-.97.554-1.925 1.106-2.867 1.656l-5.484 3.303c-19.473 12.156-31.858 25.278-32.898 54.98l-.071 4.155H71.752c0-51.355 22.158-79.19 46.838-97.595l4.964-3.56a192.48 192.48 0 0 1 2.496-1.693l5-3.229l4.978-3.04l9.759-5.616l13.787-7.712l5.652-3.305c21.022-12.65 34.51-25.579 35.597-56.632l.071-4.155zM184.252.145c0 51.35-22.153 79.185-46.833 97.591l-4.964 3.56c-.831.574-1.664 1.138-2.497 1.693l-5 3.23l-4.979 3.04l-9.76 5.616l-13.788 7.713l-5.652 3.305c-.914.55-1.814 1.1-2.7 1.653l-5.131 3.351c-16.5 11.328-26.82 24.627-27.766 51.63l-.072 4.155H0c0-54.78 25.206-82.793 51.797-101.152l4.997-3.333l4.994-3.133l4.957-2.956L87.82 64.236l5.652-3.306c21.023-12.65 34.51-25.58 35.597-56.631l.072-4.155z"/></svg>`,
      category: 'marketing',
      import: {
        name: 'useScriptHotjar',
        from: resolve('./runtime/registry/hotjar'),
      },
    },
    {
      label: 'Clarity',
      scriptBundling(options?: ClarityInput) {
        return `https://www.clarity.ms/tag/${options?.id}`
      },
      logo: `https://store-images.s-microsoft.com/image/apps.29332.512b1d3d-80ec-4aec-83bb-411008d2f7cd.76371b6f-9386-463f-bfb0-b75cffb86a4f.bd99f4b1-b18e-4380-aa79-93768763c90d.png`,
      category: 'marketing',
      import: {
        name: 'useScriptClarity',
        from: resolve('./runtime/registry/clarity'),
      },
    },
    // payments
    {
      label: 'Stripe',
      scriptBundling: false,
      category: 'payments',
      logo: `<svg xmlns="http://www.w3.org/2000/svg" width="76.57" height="32" viewBox="0 0 512 214"><path fill="#635BFF" d="M512 110.08c0-36.409-17.636-65.138-51.342-65.138c-33.85 0-54.33 28.73-54.33 64.854c0 42.808 24.179 64.426 58.88 64.426c16.925 0 29.725-3.84 39.396-9.244v-28.445c-9.67 4.836-20.764 7.823-34.844 7.823c-13.796 0-26.027-4.836-27.591-21.618h69.547c0-1.85.284-9.245.284-12.658m-70.258-13.511c0-16.071 9.814-22.756 18.774-22.756c8.675 0 17.92 6.685 17.92 22.756zm-90.31-51.627c-13.939 0-22.899 6.542-27.876 11.094l-1.85-8.818h-31.288v165.83l35.555-7.537l.143-40.249c5.12 3.698 12.657 8.96 25.173 8.96c25.458 0 48.64-20.48 48.64-65.564c-.142-41.245-23.609-63.716-48.498-63.716m-8.534 97.991c-8.391 0-13.37-2.986-16.782-6.684l-.143-52.765c3.698-4.124 8.818-6.968 16.925-6.968c12.942 0 21.902 14.506 21.902 33.137c0 19.058-8.818 33.28-21.902 33.28M241.493 36.551l35.698-7.68V0l-35.698 7.538zm0 10.809h35.698v124.444h-35.698zm-38.257 10.524L200.96 47.36h-30.72v124.444h35.556V87.467c8.39-10.951 22.613-8.96 27.022-7.396V47.36c-4.551-1.707-21.191-4.836-29.582 10.524m-71.112-41.386l-34.702 7.395l-.142 113.92c0 21.05 15.787 36.551 36.836 36.551c11.662 0 20.195-2.133 24.888-4.693V140.8c-4.55 1.849-27.022 8.391-27.022-12.658V77.653h27.022V47.36h-27.022zM35.982 83.484c0-5.546 4.551-7.68 12.09-7.68c10.808 0 24.461 3.272 35.27 9.103V51.484c-11.804-4.693-23.466-6.542-35.27-6.542C19.2 44.942 0 60.018 0 85.192c0 39.252 54.044 32.995 54.044 49.92c0 6.541-5.688 8.675-13.653 8.675c-11.804 0-26.88-4.836-38.827-11.378v33.849c13.227 5.689 26.596 8.106 38.827 8.106c29.582 0 49.92-14.648 49.92-40.106c-.142-42.382-54.329-34.845-54.329-50.774"/></svg>`,
      import: {
        name: 'useScriptStripe',
        from: resolve('./runtime/registry/stripe'),
      },
    },
    {
      label: 'Lemon Squeezy',
      src: false, // should not be bundled
      category: 'payments',
      logo: `<svg width="21" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="m6.929 17.186 7.511 3.472a3.846 3.846 0 0 1 1.943 1.983c.898 2.099-.33 4.246-2.255 5.018-1.926.772-3.979.275-4.912-1.908l-3.27-7.664c-.253-.595.384-1.178.983-.901ZM7.38 14.938l7.753-2.931c2.577-.974 5.392.869 5.354 3.547l-.003.105c-.055 2.608-2.792 4.36-5.312 3.438l-7.786-2.85a.694.694 0 0 1-.007-1.31ZM6.945 13.922l7.622-3.238C17.1 9.607 17.743 6.377 15.76 4.51a9.026 9.026 0 0 0-.078-.073c-1.945-1.805-5.16-1.17-6.267 1.208l-3.42 7.347c-.274.585.343 1.189.951.93ZM4.983 12.643l2.772-7.599a3.678 3.678 0 0 0-.076-2.732C6.78.214 4.344-.464 2.42.31.493 1.083-.595 2.84.34 5.023l3.29 7.656c.255.593 1.132.57 1.352-.036Z" fill="#FFC233"/></svg>`,
      import: {
        name: 'useScriptLemonSqueezy',
        from: resolve('./runtime/registry/lemon-squeezy'),
      },
    },
    // content
    {
      label: 'Vimeo Player',
      category: 'content',
      logo: `<svg xmlns="http://www.w3.org/2000/svg" width="36.74" height="32" viewBox="0 0 256 223"><path fill="#32B8E8" d="M255.876 51.662c-1.139 24.968-18.545 59.157-52.209 102.55c-34.806 45.327-64.254 67.989-88.343 67.989c-14.918 0-27.551-13.799-37.863-41.406c-6.892-25.306-13.775-50.61-20.664-75.915c-7.663-27.592-15.878-41.406-24.661-41.406c-1.915 0-8.617 4.038-20.091 12.081L0 60.008a3257.325 3257.325 0 0 0 37.36-33.38C54.21 12.038 66.86 4.366 75.29 3.59c19.925-1.917 32.187 11.728 36.79 40.938c4.974 31.514 8.415 51.116 10.35 58.788c5.742 26.145 12.06 39.201 18.965 39.201c5.358 0 13.407-8.478 24.138-25.436c10.722-16.963 16.464-29.868 17.24-38.733c1.525-14.638-4.22-21.975-17.24-21.975c-6.128 0-12.447 1.413-18.946 4.206c12.58-41.29 36.618-61.343 72.1-60.199c26.304.773 38.705 17.867 37.19 51.282"/></svg>`,
      import: {
        name: 'useScriptVimeoPlayer',
        from: resolve('./runtime/registry/vimeo-player'),
      },
    },
    {
      label: 'YouTube Player',
      category: 'content',
      logo: `<svg xmlns="http://www.w3.org/2000/svg" width="45.52" height="32" viewBox="0 0 256 180"><path fill="red" d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134"/><path fill="#FFF" d="m102.421 128.06l66.328-38.418l-66.328-38.418z"/></svg>`,
      import: {
        name: 'useScriptYouTubePlayer',
        from: resolve('./runtime/registry/youtube-player'),
      },
    },
    {
      label: 'Google Maps',
      category: 'content',
      logo: `<svg xmlns="http://www.w3.org/2000/svg" width="22.33" height="32" viewBox="0 0 256 367"><path fill="#34A853" d="M70.585 271.865a370.712 370.712 0 0 1 28.911 42.642c7.374 13.982 10.448 23.463 15.837 40.31c3.305 9.308 6.292 12.086 12.714 12.086c6.998 0 10.173-4.726 12.626-12.035c5.094-15.91 9.091-28.052 15.397-39.525c12.374-22.15 27.75-41.833 42.858-60.75c4.09-5.354 30.534-36.545 42.439-61.156c0 0 14.632-27.035 14.632-64.792c0-35.318-14.43-59.813-14.43-59.813l-41.545 11.126l-25.23 66.451l-6.242 9.163l-1.248 1.66l-1.66 2.078l-2.914 3.319l-4.164 4.163l-22.467 18.304l-56.17 32.432z"/><path fill="#FBBC04" d="M12.612 188.892c13.709 31.313 40.145 58.839 58.031 82.995l95.001-112.534s-13.384 17.504-37.662 17.504c-27.043 0-48.89-21.595-48.89-48.825c0-18.673 11.234-31.501 11.234-31.501l-64.489 17.28z"/><path fill="#4285F4" d="M166.705 5.787c31.552 10.173 58.558 31.53 74.893 63.023l-75.925 90.478s11.234-13.06 11.234-31.617c0-27.864-23.463-48.68-48.81-48.68c-23.969 0-37.735 17.475-37.735 17.475v-57z"/><path fill="#1A73E8" d="M30.015 45.765C48.86 23.218 82.02 0 127.736 0c22.18 0 38.89 5.823 38.89 5.823L90.29 96.516H36.205z"/><path fill="#EA4335" d="M12.612 188.892S0 164.194 0 128.414c0-33.817 13.146-63.377 30.015-82.649l60.318 50.759z"/></svg>`,
      import: {
        name: 'useScriptGoogleMaps',
        from: resolve('./runtime/registry/google-maps'),
      },
    },
    // chat
    {
      label: 'Crisp',
      category: 'support',
      logo: {
        light: `<svg height="30" width="35" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><filter id="a" height="138.7%" width="131.4%" x="-15.7%" y="-15.1%"><feMorphology in="SourceAlpha" operator="dilate" radius="1" result="shadowSpreadOuter1"/><feOffset dy="1" in="shadowSpreadOuter1" result="shadowOffsetOuter1"/><feGaussianBlur in="shadowOffsetOuter1" result="shadowBlurOuter1" stdDeviation="1"/><feComposite in="shadowBlurOuter1" in2="SourceAlpha" operator="out" result="shadowBlurOuter1"/><feColorMatrix in="shadowBlurOuter1" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0"/></filter><path id="b" d="M14.23 20.46l-9.65 1.1L3 5.12 30.07 2l1.58 16.46-9.37 1.07-3.5 5.72-4.55-4.8z"/></defs><g fill="none" fill-rule="evenodd"><use fill="#000" filter="url(#a)" xlink:href="#b"/><use fill="#1972f5" stroke="#1972f5" stroke-width="2" xlink:href="#b"/></g></svg>`,
        dark: `<svg height="30" width="35" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><filter id="a" height="138.7%" width="131.4%" x="-15.7%" y="-15.1%"><feMorphology in="SourceAlpha" operator="dilate" radius="1" result="shadowSpreadOuter1"/><feOffset dy="1" in="shadowSpreadOuter1" result="shadowOffsetOuter1"/><feGaussianBlur in="shadowOffsetOuter1" result="shadowBlurOuter1" stdDeviation="1"/><feComposite in="shadowBlurOuter1" in2="SourceAlpha" operator="out" result="shadowBlurOuter1"/><feColorMatrix in="shadowBlurOuter1" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0"/></filter><path id="b" d="M14.23 20.46l-9.65 1.1L3 5.12 30.07 2l1.58 16.46-9.37 1.07-3.5 5.72-4.55-4.8z"/></defs><g fill="none" fill-rule="evenodd"><use fill="#000" filter="url(#a)" xlink:href="#b"/><use fill="#fff" stroke="#fff" stroke-width="2" xlink:href="#b"/></g></svg>`,
      },
      import: {
        name: 'useScriptCrisp',
        from: resolve('./runtime/registry/crisp'),
      },
    },
    // other
    {
      label: 'NPM',
      scriptBundling(options?: NpmInput) {
        return withBase(options?.file || '', `https://unpkg.com/${options?.packageName || ''}@${options?.version || 'latest'}`)
      },
      logo: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><path fill="#C12127" d="M0 256V0h256v256z"/><path fill="#FFF" d="M48 48h160v160h-32V80h-48v128H48z"/></svg>`,
      category: 'utility',
      import: {
        name: 'useScriptNpm',
        // key is based on package name
        from: resolve('./runtime/registry/npm'),
      },
    },
    {
      label: 'Google Tag Manager',
      category: 'tracking',
      import: {
        name: 'useScriptGoogleTagManager',
        from: resolve('./runtime/registry/google-tag-manager'),
      },
      logo: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><path fill="#8AB4F8" d="m150.262 245.516l-44.437-43.331l95.433-97.454l46.007 45.091z"/><path fill="#4285F4" d="M150.45 53.938L106.176 8.731L9.36 104.629c-12.48 12.48-12.48 32.713 0 45.207l95.36 95.986l45.09-42.182l-72.654-76.407z"/><path fill="#8AB4F8" d="m246.625 105.37l-96-96c-12.494-12.494-32.756-12.494-45.25 0c-12.495 12.495-12.495 32.757 0 45.252l96 96c12.494 12.494 32.756 12.494 45.25 0c12.495-12.495 12.495-32.757 0-45.251"/><circle cx="127.265" cy="224.731" r="31.273" fill="#246FDB"/></svg>`,
      scriptBundling(options) {
        const data = GoogleTagManager(options)
        const mainScript = data.scripts?.find(({ key }) => key === 'gtag')

        if (mainScript && 'url' in mainScript && mainScript.url)
          return mainScript.url

        return false
      },
    },
    {
      label: 'Google Analytics',
      category: 'analytics',
      import: {
        name: 'useScriptGoogleAnalytics',
        from: resolve('./runtime/registry/google-analytics'),
      },
      logo: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="192px" height="192px" viewBox="0 0 192 192" enable-background="new 0 0 192 192" xml:space="preserve"><rect x="0" y="0" fill="none" width="192" height="192"/><g><g><path fill="#F9AB00" d="M130,29v132c0,14.77,10.19,23,21,23c10,0,21-7,21-23V30c0-13.54-10-22-21-22S130,17.33,130,29z"/></g><g><path fill="#E37400" d="M75,96v65c0,14.77,10.19,23,21,23c10,0,21-7,21-23V97c0-13.54-10-22-21-22S75,84.33,75,96z"/></g><g><circle fill="#E37400" cx="41" cy="163" r="21"/></g></g></svg>`,
      scriptBundling(options) {
        const data = GoogleAnalytics(options)
        const mainScript = data.scripts?.find(({ key }) => key === 'gtag')

        if (mainScript && 'url' in mainScript && mainScript.url)
          return mainScript.url

        return false
      },
    },
  ]
}
