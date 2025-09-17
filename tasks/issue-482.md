Google Tag Manager - Source option #482
Open
@mattgrah-am
Description
Matt Graham
opened on Aug 6
🆒 Your use case
Is it possible to add the source option into the Google tag manager paramaters like it is in zadigetvoltaire/nuxt-gtm

/**
* The URL of the script; useful for server-side GTM.
*
* @default https://www.googletagmanager.com/gtm.js
  */
  source?: string;
  🆕 The solution you'd like
  GoogleTagManagerOptions would include the ability to add the source as an option for server side GTM

export const GoogleTagManagerOptions = object({
/** GTM container ID (format: GTM-XXXXXX) */
id: string(),

/** Optional dataLayer variable name */
l: optional(string()),

/** Authentication token for environment-specific container versions */
auth: optional(string()),

/** Preview environment name */
preview: optional(string()),

/** Forces GTM cookies to take precedence when true */
cookiesWin: optional(union([boolean(), literal('x')])),

/** Enables debug mode when true */
debug: optional(union([boolean(), literal('x')])),

/** No Personal Advertising - disables advertising features when true */
npa: optional(union([boolean(), literal('1')])),

/** Custom dataLayer name (alternative to "l" property) */
dataLayer: optional(string()),

/** Environment name for environment-specific container */
envName: optional(string()),

/** Referrer policy for analytics requests */
authReferrerPolicy: optional(string()),
})
🔍 Alternatives you've considered
No response

ℹ️ Additional info
No response

Activity

mattgrah-am
added
enhancement
New feature or request
on Aug 6
MuhammadM1998
MuhammadM1998 commented on Aug 7
MuhammadM1998
(Muhammad Mahmoud)
on Aug 7
There's already a PR for this #408

joaopedrodcf
joaopedrodcf commented 2 days ago
joaopedrodcf
(João Ferreira)
2 days ago
Maybe you can try for now to use the src to add the full path:

const gtmId = 'XXX';

useScriptGoogleTagManager({
scriptInput: {
src: "https://www.mydomain.com/gtm.js?id=" + gtmId,
},
});
