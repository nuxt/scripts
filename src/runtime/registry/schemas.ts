import { any, array, boolean, custom, literal, minLength, number, object, optional, pipe, record, string, union } from '#nuxt-scripts-validator'

export const ClarityOptions = object({
  /**
   * The Clarity token.
   * @see https://learn.microsoft.com/en-us/clarity/setup-clarity
   */
  id: pipe(string(), minLength(10)),
})

export const CloudflareWebAnalyticsOptions = object({
  /**
   * The Cloudflare Web Analytics token.
   * @see https://developers.cloudflare.com/analytics/web-analytics/get-started/
   */
  token: pipe(string(), minLength(32)),
  /**
   * Cloudflare Web Analytics enables measuring SPAs automatically by overriding the History API's pushState function
   * and listening to the onpopstate. Hash-based router is not supported.
   *
   * @default true
   * @see https://developers.cloudflare.com/analytics/web-analytics/get-started/#spa-tracking
   */
  spa: optional(boolean()),
})

export const CrispOptions = object({
  /**
   * The Crisp ID.
   */
  id: string(),
  /**
   * Extra configuration options. Used to configure the locale.
   * Same as CRISP_RUNTIME_CONFIG.
   * @see https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/language-customization/
   */
  runtimeConfig: optional(object({
    locale: optional(string()),
  })),
  /**
   * Associated a session, equivalent to using CRISP_TOKEN_ID variable.
   * Same as CRISP_TOKEN_ID.
   * @see https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/session-continuity/
   */
  tokenId: optional(string()),
  /**
   * Restrict the domain that the Crisp cookie is set on.
   * Same as CRISP_COOKIE_DOMAIN.
   * @see https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/cookie-policies/
   */
  cookieDomain: optional(string()),
  /**
   * The cookie expiry in seconds.
   * Same as CRISP_COOKIE_EXPIRATION.
   * @see https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/cookie-policies/#change-cookie-expiration-date
   */
  cookieExpiry: optional(number()),
})

/**
 * @see https://www.databuddy.cc/docs/sdk
 */
export const DatabuddyAnalyticsOptions = object({
  /**
   * Your Databuddy client ID.
   */
  clientId: string(),

  /**
   * Custom script URL for the Databuddy SDK.
   * @default 'https://cdn.databuddy.cc/databuddy.js'
   */
  scriptUrl: optional(string()),
  /**
   * Custom API URL for sending analytics data.
   * @default 'https://basket.databuddy.cc'
   */
  apiUrl: optional(string()),
  /**
   * Disable all tracking when set to `true`.
   */
  disabled: optional(boolean()),

  /**
   * Track screen/page views automatically.
   * @default true
   * @see https://www.databuddy.cc/docs/sdk#track-screen-views
   */
  trackScreenViews: optional(boolean()),
  /**
   * Track page performance metrics.
   * @default true
   * @see https://www.databuddy.cc/docs/sdk#track-performance
   */
  trackPerformance: optional(boolean()),
  /**
   * Track user sessions.
   * @default true
   * @see https://www.databuddy.cc/docs/sdk#track-sessions
   */
  trackSessions: optional(boolean()),

  /**
   * Track Web Vitals (LCP, FID, CLS, etc.).
   */
  trackWebVitals: optional(boolean()),
  /**
   * Track JavaScript errors.
   */
  trackErrors: optional(boolean()),
  /**
   * Track outgoing link clicks.
   */
  trackOutgoingLinks: optional(boolean()),
  /**
   * Track scroll depth.
   */
  trackScrollDepth: optional(boolean()),
  /**
   * Track user engagement time.
   */
  trackEngagement: optional(boolean()),
  /**
   * Track user interactions (clicks, form submissions, etc.).
   */
  trackInteractions: optional(boolean()),
  /**
   * Track element attributes for detailed interaction context.
   */
  trackAttributes: optional(boolean()),
  /**
   * Track hash changes in the URL.
   */
  trackHashChanges: optional(boolean()),
  /**
   * Track exit intent behavior.
   */
  trackExitIntent: optional(boolean()),
  /**
   * Track bounce rate metrics.
   */
  trackBounceRate: optional(boolean()),

  /**
   * Enable event batching for better performance.
   */
  enableBatching: optional(boolean()),
  /**
   * Maximum number of events per batch.
   */
  batchSize: optional(number()),
  /**
   * Timeout (in ms) before flushing a batch.
   */
  batchTimeout: optional(number()),
  /**
   * Enable automatic retries for failed requests.
   */
  enableRetries: optional(boolean()),
  /**
   * Maximum number of retry attempts.
   */
  maxRetries: optional(number()),
  /**
   * Initial delay (in ms) before the first retry.
   */
  initialRetryDelay: optional(number()),
  /**
   * Sampling rate (0 to 1). Set to `0.5` to track ~50% of sessions.
   */
  samplingRate: optional(number()),

  /**
   * Custom SDK identifier.
   */
  sdk: optional(string()),
  /**
   * Custom SDK version string.
   */
  sdkVersion: optional(string()),

  /**
   * Enable observability/monitoring features.
   */
  enableObservability: optional(boolean()),
  /**
   * The service name for observability reporting.
   */
  observabilityService: optional(string()),
  /**
   * The environment name for observability (e.g., `'production'`, `'staging'`).
   */
  observabilityEnvironment: optional(string()),
  /**
   * The version string for observability reporting.
   */
  observabilityVersion: optional(string()),
  /**
   * Enable console logging for debugging.
   */
  enableLogging: optional(boolean()),
  /**
   * Enable request tracing.
   */
  enableTracing: optional(boolean()),
  /**
   * Enable error tracking via observability.
   */
  enableErrorTracking: optional(boolean()),
})

export const FathomAnalyticsOptions = object({
  /**
   * The Fathom Analytics site ID.
   * @see https://usefathom.com/docs/script/script-settings
   */
  site: string(),
  /**
   * The Fathom Analytics tracking mode.
   * @default 'auto'
   */
  spa: optional(union([literal('auto'), literal('history'), literal('hash')])),
  /**
   * Automatically track page views.
   * @default true
   */
  auto: optional(boolean()),
  /**
   * Enable canonical URL tracking.
   * @default true
   */
  canonical: optional(boolean()),
  /**
   * Honor Do Not Track requests.
   * @default false
   */
  honorDnt: optional(boolean()),
})

export const GoogleAdsenseOptions = object({
  /**
   * The Google Adsense ID.
   * @example 'ca-pub-XXXXXXXXXXXXXXXX'
   */
  client: optional(string()),
  /**
   * Enable or disable Auto Ads.
   * @default false
   * @see https://support.google.com/adsense/answer/9261805
   */
  autoAds: optional(boolean()),
})

export const GoogleAnalyticsOptions = object({
  /**
   * The GA4 measurement ID.
   * @example 'G-XXXXXXXX'
   * @see https://developers.google.com/analytics/devguides/collection/gtagjs
   */
  id: optional(string()),
  /**
   * Global name for the dataLayer variable.
   * @default 'dataLayer'
   * @see https://developers.google.com/analytics/devguides/collection/gtagjs/setting-up-gtag#rename_the_data_layer
   */
  l: optional(string()),
})

export const GoogleMapsOptions = object({
  /**
   * Your Google Maps API key.
   */
  apiKey: string(),
  /**
   * The Google Maps libraries to load.
   * @default ['places']
   * @see https://developers.google.com/maps/documentation/javascript/libraries
   */
  libraries: optional(array(string())),
  /**
   * The language code for the map UI and geocoding results.
   * @see https://developers.google.com/maps/faq#languagesupport
   */
  language: optional(string()),
  /**
   * The region code to bias geocoding results.
   * @see https://developers.google.com/maps/documentation/javascript/localization#Region
   */
  region: optional(string()),
  /**
   * The Google Maps JS API version to load.
   * @default 'weekly'
   * @see https://developers.google.com/maps/documentation/javascript/versions
   */
  v: optional(union([literal('weekly'), literal('quarterly'), literal('beta'), literal('alpha'), string()])),
})

export const GoogleRecaptchaOptions = object({
  /**
   * Your reCAPTCHA site key.
   * @see https://developers.google.com/recaptcha/docs/display#render_param
   */
  siteKey: string(),
  /**
   * Use the Enterprise version of reCAPTCHA (enterprise.js instead of api.js).
   * @see https://cloud.google.com/recaptcha-enterprise/docs/introduction
   */
  enterprise: optional(boolean()),
  /**
   * Use recaptcha.net instead of google.com domain. Useful for regions where google.com is blocked.
   */
  recaptchaNet: optional(boolean()),
  /**
   * Language code for the reCAPTCHA widget.
   * @see https://developers.google.com/recaptcha/docs/language
   */
  hl: optional(string()),
})

export const GoogleSignInOptions = object({
  /**
   * Your Google API client ID.
   * @example 'XXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com'
   * @see https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
   */
  clientId: string(),
  /**
   * Auto-select credentials when only one Google account is available.
   * @see https://developers.google.com/identity/gsi/web/reference/js-reference#auto_select
   */
  autoSelect: optional(boolean()),
  /**
   * The context text for the One Tap prompt.
   * @see https://developers.google.com/identity/gsi/web/reference/js-reference#context
   */
  context: optional(union([literal('signin'), literal('signup'), literal('use')])),
  /**
   * Enable FedCM (Federated Credential Management) API support. Mandatory from August 2025.
   * @see https://developers.google.com/identity/gsi/web/guides/fedcm-migration
   */
  useFedcmForPrompt: optional(boolean()),
  /**
   * Cancel the One Tap prompt if the user clicks outside.
   * @default true
   * @see https://developers.google.com/identity/gsi/web/reference/js-reference#cancel_on_tap_outside
   */
  cancelOnTapOutside: optional(boolean()),
  /**
   * The UX mode for the sign-in flow.
   * @see https://developers.google.com/identity/gsi/web/reference/js-reference#ux_mode
   */
  uxMode: optional(union([literal('popup'), literal('redirect')])),
  /**
   * The URI to redirect to after sign-in when using redirect UX mode.
   * @see https://developers.google.com/identity/gsi/web/reference/js-reference#login_uri
   */
  loginUri: optional(string()),
  /**
   * Enable Intelligent Tracking Prevention (ITP) support for Safari.
   * @see https://developers.google.com/identity/gsi/web/reference/js-reference#itp_support
   */
  itpSupport: optional(boolean()),
  /**
   * Allowed parent origin(s) for iframe embedding.
   * @see https://developers.google.com/identity/gsi/web/reference/js-reference#allowed_parent_origin
   */
  allowedParentOrigin: optional(union([string(), array(string())])),
  /**
   * Restrict sign-in to a specific Google Workspace hosted domain.
   * @example 'example.com'
   * @see https://developers.google.com/identity/gsi/web/reference/js-reference#hd
   */
  hd: optional(string()),
})

/**
 * GTM configuration options with improved documentation
 */
export const GoogleTagManagerOptions = object({
  /**
   * GTM container ID (format: GTM-XXXXXX)
   * @see https://developers.google.com/tag-platform/tag-manager/web#install-the-container
   */
  id: string(),

  /**
   * Optional dataLayer variable name
   * @default 'dataLayer'
   * @see https://developers.google.com/tag-platform/tag-manager/web/datalayer#rename_the_data_layer
   */
  l: optional(string()),

  /**
   * Authentication token for environment-specific container versions
   * @see https://support.google.com/tagmanager/answer/6328337
   */
  auth: optional(string()),

  /**
   * Preview environment name
   * @see https://support.google.com/tagmanager/answer/6328337
   */
  preview: optional(string()),

  /** Forces GTM cookies to take precedence when true */
  cookiesWin: optional(union([boolean(), literal('x')])),

  /**
   * Enables debug mode when true
   * @see https://support.google.com/tagmanager/answer/6107056
   */
  debug: optional(union([boolean(), literal('x')])),

  /**
   * No Personal Advertising - disables advertising features when true
   * @see https://developers.google.com/tag-platform/tag-manager/templates/consent-apis
   */
  npa: optional(union([boolean(), literal('1')])),

  /** Custom dataLayer name (alternative to "l" property) */
  dataLayer: optional(string()),

  /**
   * Environment name for environment-specific container
   * @see https://support.google.com/tagmanager/answer/6328337
   */
  envName: optional(string()),

  /** Referrer policy for analytics requests */
  authReferrerPolicy: optional(string()),

  /**
   * Default consent settings for GTM
   * @see https://developers.google.com/tag-platform/tag-manager/templates/consent-apis
   */
  defaultConsent: optional(record(string(), union([string(), number()]))),
})

export const HotjarOptions = object({
  /**
   * Your Hotjar Site ID.
   * @see https://help.hotjar.com/hc/en-us/articles/115012039247-Hotjar-Tracking-Code
   */
  id: number(),
  /**
   * The Hotjar snippet version.
   * @default 6
   */
  sv: optional(number()),
})

export const InstagramEmbedOptions = object({
  /**
   * The Instagram post URL to embed.
   * @example 'https://www.instagram.com/p/C_XXXXXXXXX/'
   * @see https://developers.facebook.com/docs/instagram/oembed/
   */
  postUrl: string(),
  /**
   * Whether to include captions in the embed.
   * @default true
   */
  captions: optional(boolean()),
  /**
   * Custom API endpoint for fetching embed HTML.
   * @default '/api/_scripts/instagram-embed'
   */
  apiEndpoint: optional(string()),
})

export const IntercomOptions = object({
  /**
   * Your Intercom app ID.
   * @see https://developers.intercom.com/installing-intercom/docs/javascript-api-attributes-objects
   */
  app_id: string(),
  /**
   * The regional API base URL. Choose based on your Intercom data hosting region.
   */
  api_base: optional(union([literal('https://api-iam.intercom.io'), literal('https://api-iam.eu.intercom.io'), literal('https://api-iam.au.intercom.io')])),
  /**
   * The name of the logged-in user.
   */
  name: optional(string()),
  /**
   * The email address of the logged-in user.
   */
  email: optional(string()),
  /**
   * A unique identifier for the logged-in user.
   */
  user_id: optional(string()),
  /**
   * The horizontal alignment of the Intercom messenger launcher.
   * @default 'right'
   */
  alignment: optional(union([literal('left'), literal('right')])),
  /**
   * The horizontal padding (in px) of the messenger launcher from the edge of the page.
   * @default 20
   */
  horizontal_padding: optional(number()),
  /**
   * The vertical padding (in px) of the messenger launcher from the bottom of the page.
   * @default 20
   */
  vertical_padding: optional(number()),
})

export const MatomoAnalyticsOptions = object({
  /**
   * The URL of your self-hosted Matomo instance.
   * Either `matomoUrl` or `cloudId` is required.
   * @example 'https://matomo.example.com'
   * @see https://developer.matomo.org/guides/tracking-javascript-guide
   */
  matomoUrl: optional(string()),
  /**
   * Your Matomo site ID.
   * @default '1'
   */
  siteId: optional(union([string(), number()])),
  /**
   * Your Matomo Cloud ID (the subdomain portion of your `*.matomo.cloud` URL).
   * Either `matomoUrl` or `cloudId` is required.
   * @example 'mysite.matomo.cloud'
   */
  cloudId: optional(string()),
  /**
   * A custom tracker URL. Overrides the default tracker endpoint derived from `matomoUrl` or `cloudId`.
   */
  trackerUrl: optional(string()),
  /**
   * Whether to track the initial page view on load.
   * @deprecated Use `watch: true` (default) for automatic page view tracking.
   */
  trackPageView: optional(boolean()),
  /**
   * Enable download and outlink tracking.
   */
  enableLinkTracking: optional(boolean()),
  /**
   * Disable all tracking cookies for cookieless analytics.
   */
  disableCookies: optional(boolean()),
  /**
   * Automatically track page views on route change.
   * @default true
   */
  watch: optional(boolean()),
})

export const MetaPixelOptions = object({
  /**
   * Your Meta (Facebook) Pixel ID.
   * @see https://developers.facebook.com/docs/meta-pixel/get-started
   */
  id: union([string(), number()]),
})

export const NpmOptions = object({
  /**
   * The npm package name to load.
   * @example 'lodash'
   */
  packageName: string(),
  /**
   * The specific file path within the package to load.
   * @example '/dist/lodash.min.js'
   */
  file: optional(string()),
  /**
   * The package version to load.
   * @default 'latest'
   */
  version: optional(string()),
  /**
   * The CDN provider to use for loading the package.
   * @default 'unpkg'
   * @see https://unpkg.com
   * @see https://www.jsdelivr.com
   * @see https://cdnjs.com
   */
  provider: optional(union([literal('jsdelivr'), literal('cdnjs'), literal('unpkg')])),
})

export const PayPalOptions = union([
  object({
    /**
     * Your PayPal client ID.
     * @see https://developer.paypal.com/sdk/js/reference/
     */
    clientId: string(),
    clientToken: optional(string()),
    /**
     * Use the PayPal sandbox environment. Defaults to `true` in development.
     */
    sandbox: optional(boolean()),
  }),
  object({
    clientId: optional(string()),
    /**
     * A server-generated client token for authentication.
     * @see https://docs.paypal.ai/payments/methods/paypal/sdk/js/v6/paypal-checkout
     */
    clientToken: string(),
    /**
     * Use the PayPal sandbox environment. Defaults to `true` in development.
     */
    sandbox: optional(boolean()),
  }),
])

export const PostHogOptions = object({
  /**
   * Your PostHog project API key.
   * @see https://posthog.com/docs/libraries/js#usage
   */
  apiKey: string(),
  /**
   * Your PostHog data region.
   * @default 'us'
   * @see https://posthog.com/docs/libraries/js#config
   */
  region: optional(union([literal('us'), literal('eu')])),
  /**
   * Custom API host URL. Overrides the default derived from `region`.
   * Useful for self-hosted instances or reverse proxies.
   */
  apiHost: optional(string()),
  /**
   * Enable autocapture of clicks, form submissions, and page views.
   * @default true
   */
  autocapture: optional(boolean()),
  /**
   * Capture page views automatically. Set to `'history_change'` to only capture on history changes.
   * @default true
   */
  capturePageview: optional(union([boolean(), literal('history_change')])),
  /**
   * Capture page leave events automatically.
   * @default true
   */
  capturePageleave: optional(boolean()),
  /**
   * Disable session recording.
   */
  disableSessionRecording: optional(boolean()),
  /**
   * Additional PostHog configuration options passed directly to `posthog.init()`.
   * @see https://posthog.com/docs/libraries/js#config
   */
  config: optional(record(string(), any())),
})

export const RedditPixelOptions = object({
  /**
   * Your Reddit Pixel advertiser ID.
   * @see https://reddithelp.com/en/categories/advertising/managing-ads/installing-reddit-pixel
   */
  id: string(),
})

export const RybbitAnalyticsOptions = object({
  /**
   * Your Rybbit site ID.
   * @see https://rybbit.io/docs
   */
  siteId: union([string(), number()]),
  /**
   * Automatically track page views.
   * @default true
   */
  autoTrackPageview: optional(boolean()),
  /**
   * Enable SPA (single-page app) route tracking.
   * @default true
   */
  trackSpa: optional(boolean()),
  /**
   * Include query parameters in tracked URLs.
   */
  trackQuery: optional(boolean()),
  /**
   * Track outbound link clicks.
   */
  trackOutbound: optional(boolean()),
  /**
   * Track JavaScript errors.
   */
  trackErrors: optional(boolean()),
  /**
   * Enable session replay recording.
   */
  sessionReplay: optional(boolean()),
  /**
   * Enable Web Vitals tracking (LCP, FID, CLS, etc.).
   */
  webVitals: optional(boolean()),
  /**
   * URL patterns to skip from tracking (glob syntax).
   */
  skipPatterns: optional(array(string())),
  /**
   * URL patterns to mask in tracked data (glob syntax).
   */
  maskPatterns: optional(array(string())),
  /**
   * Debounce interval (in ms) for page view tracking.
   */
  debounce: optional(number()),
  /**
   * API key for authenticated tracking.
   */
  apiKey: optional(string()),
})

export const SegmentOptions = object({
  /**
   * Your Segment write key.
   * @see https://segment.com/docs/connections/sources/catalog/libraries/website/javascript/quickstart/
   */
  writeKey: string(),
  /**
   * The global variable name for the analytics instance.
   * @default 'analytics'
   */
  analyticsKey: optional(string()),
})

export const InitObjectPropertiesSchema = object({
  /**
   * The user's email address (for matching).
   */
  user_email: optional(string()),
  /**
   * The user's IP address.
   */
  ip_address: optional(string()),
  /**
   * The user's phone number (for matching).
   */
  user_phone_number: optional(string()),
  /**
   * SHA-256 hashed email address.
   */
  user_hashed_email: optional(string()),
  /**
   * SHA-256 hashed phone number.
   */
  user_hashed_phone_number: optional(string()),
  /**
   * The user's first name.
   */
  firstname: optional(string()),
  /**
   * The user's last name.
   */
  lastname: optional(string()),
  /**
   * The user's city.
   */
  geo_city: optional(string()),
  /**
   * The user's region/state.
   */
  geo_region: optional(string()),
  /**
   * The user's postal/zip code.
   */
  geo_postal_code: optional(string()),
  /**
   * The user's country code.
   */
  geo_country: optional(string()),
  /**
   * The user's age.
   */
  age: optional(string()),
})

export const SnapTrPixelOptions = object({
  /**
   * Your Snapchat Pixel ID.
   * @see https://businesshelp.snapchat.com/s/article/pixel-website-install
   */
  id: string(),
  /**
   * Whether to automatically track a `PAGE_VIEW` event on initialization.
   */
  trackPageView: optional(boolean()),
  ...(InitObjectPropertiesSchema?.entries || {}),
})

export const StripeOptions = object({
  /**
   * Whether to load Stripe's advanced fraud detection signals.
   * Set to `false` to opt out.
   * @default true
   * @see https://docs.stripe.com/disputes/prevention/advanced-fraud-detection
   */
  advancedFraudSignals: optional(boolean()),
})

export const TikTokPixelOptions = object({
  /**
   * Your TikTok Pixel ID.
   * @see https://ads.tiktok.com/help/article/get-started-pixel
   */
  id: string(),
  /**
   * Whether to automatically track a page view on initialization.
   * @default true
   */
  trackPageView: optional(boolean()),
})

export const UmamiAnalyticsOptions = object({
  /**
   * Your Umami website ID.
   * @see https://umami.is/docs/tracker-config
   */
  websiteId: string(), // required
  /**
   * By default, Umami will send data to wherever the script is located.
   * You can override this to send data to another location.
   * @see https://umami.is/docs/tracker-config#data-host-url
   */
  hostUrl: optional(string()),
  /**
   * By default, Umami tracks all pageviews and events for you automatically.
   * You can disable this behavior and track events yourself using the tracker functions.
   * @default true
   * @see https://umami.is/docs/tracker-functions
   */
  autoTrack: optional(boolean()),
  /**
   * If you want the tracker to only run on specific domains, you can add them to your tracker script.
   * This is a comma delimited list of domain names.
   * Helps if you are working in a staging/development environment.
   * @see https://umami.is/docs/tracker-config#data-domains
   */
  domains: optional(array(string())),
  /**
   * If you want the tracker to collect events under a specific tag.
   * Events can be filtered in the dashboard by a specific tag.
   * @see https://umami.is/docs/tracker-config#data-tag
   */
  tag: optional(string()),
  /**
   * Function that will be called before data is sent to Umami.
   * The function takes two parameters: type and payload.
   * Return the payload to continue sending, or return a falsy value to cancel.
   * @see https://umami.is/docs/tracker-config#data-before-send
   */
  beforeSend: optional(union([
    custom<(type: string, payload: Record<string, any>) => Record<string, any> | null | false>(input => typeof input === 'function'),
    string(),
  ])),
})

export const XEmbedOptions = object({
  /**
   * The tweet ID to embed.
   * @example '1754336034228171055'
   * @see https://developer.x.com/en/docs/twitter-for-websites/embedded-tweets/overview
   */
  tweetId: string(),
  /**
   * Optional: Custom API endpoint for fetching tweet data.
   * @default '/api/_scripts/x-embed'
   */
  apiEndpoint: optional(string()),
  /**
   * Optional: Custom image proxy endpoint.
   * @default '/api/_scripts/x-embed-image'
   */
  imageProxyEndpoint: optional(string()),
})

export const VercelAnalyticsOptions = object({
  /**
   * The DSN of the project to send events to.
   * Only required when self-hosting or deploying outside of Vercel.
   */
  dsn: optional(string()),
  /**
   * Whether to disable automatic page view tracking on route changes.
   * Set to true if you want to manually call pageview().
   */
  disableAutoTrack: optional(boolean()),
  /**
   * The mode to use for the analytics script.
   * - `auto` - Automatically detect the environment (default)
   * - `production` - Always use production script
   * - `development` - Always use development script (logs to console)
   */
  mode: optional(union([literal('auto'), literal('development'), literal('production')])),
  /**
   * Whether to enable debug logging.
   * Automatically enabled in development/test environments.
   */
  debug: optional(boolean()),
  /**
   * Custom endpoint for data collection.
   * Useful for self-hosted or proxied setups.
   */
  endpoint: optional(string()),
})

export const XPixelOptions = object({
  /**
   * Your X (Twitter) Pixel ID.
   * @see https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html
   */
  id: string(),
  /**
   * The X Pixel script version.
   * @default '1.1'
   */
  version: optional(string()),
})

export const GravatarOptions = object({
  /**
   * Cache duration for proxied avatar images in seconds.
   * @default 3600
   */
  cacheMaxAge: optional(number()),
  /**
   * Default image to show when no Gravatar exists.
   * @see https://docs.gravatar.com/general/images/#default-image
   * @default 'mp'
   */
  default: optional(string()),
  /**
   * Avatar size in pixels (1-2048).
   * @default 80
   */
  size: optional(number()),
  /**
   * Content rating filter.
   * @default 'g'
   */
  rating: optional(string()),
})
