Error 500 Internal server error on devtools scripts panel #481
Open
Open
Error 500 Internal server error on devtools scripts panel
#481
@Kumzy
Description
Kumzy
(Julien)
opened on Jul 24 · edited by Kumzy
Hello, when trying to access through DevTools to the Scripts panel, I have an error 500 on the panel with the following error

can't convert undefined to object

I can not find any logs to see where the error comes from.

Here is part of my nuxt.config.ts (excluded some parts)

export default defineNuxtConfig({
devtools: {
enabled: true,
},
runtimeConfig: {
public: {
scripts: {
googleAnalytics: {
id: "",
},
clarity: {
id: "",
},
googleTagManager: {
id: "",
},
},
},
},
modules: [
"@vueuse/nuxt",
"@nuxtjs/i18n",
"@nuxt/image",
"@nuxtjs/sitemap",
"@nuxtjs/robots",
"nuxt-schema-org",
"nuxt-og-image",
"nuxt-link-checker",
"nuxt-seo-utils",
"@vee-validate/nuxt",
"@nuxt/content",
"@dargmuesli/nuxt-cookie-control",
"nuxt-security",
"nuxt-viewport",
"@nuxt/scripts",
],
scripts: {
enabled: true,
debug: true,
registry: {
googleTagManager: true,
clarity: true,
googleAnalytics: true,
},
},
});
I am running Nuxt4

Also I could not reproduce using Stackblitz

Activity
Kumzy
Kumzy commented on Jul 25
Kumzy
(Julien)
on Jul 25
Author
Is there anything I can do to get the trace of the error?

joaopedrodcf
joaopedrodcf commented 2 days ago
joaopedrodcf
(João Ferreira)
2 days ago
Can you add an example in stackblitz with a minimal reproduction ?

Kumzy
Kumzy commented 2 days ago
Kumzy
(Julien)
2 days ago
Author
Sorry as I said in the original post, I did not succeed reproducing the error using Stackblitz.
I tried to upgrade all dependencies and the error is still there.

joaopedrodcf
joaopedrodcf commented yesterday
joaopedrodcf
(João Ferreira)
yesterday
Can you check your lock file and check the exact dependencies and on stackblitz add the same ones ? because you may be installing a different version because of the carrot ^ etc on package json

Kumzy
Kumzy commented 13 hours ago
Kumzy
(Julien)
13 hours ago
Author
I was indeed at version 0.11.10
Upgraded to the latest release 0.11.13 and the issue is still there

The Stackblitz link when creating an issue has nuxt/scripts at version 0.10.X

