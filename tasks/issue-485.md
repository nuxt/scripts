Force to download files in nuxt.config.ts on compile time #485
Open
@agracia-foticos
Description
agracia-foticos
(Alberto Gracia)
opened on Aug 14 · edited by agracia-foticos
🆒 Your use case
Force to download files in nuxt.config.ts on compile time, if file exists doesnt download in compile time, but file maybe can change... force download always trough param in nuxt.config.ts

🆕 The solution you'd like
add a param in nuxt.config.ts
scripts: { defaultScriptOptions: { bundle: true, forceDownload:true }},

to force download anytime the scripts

🔍 Alternatives you've considered
No response

ℹ️ Additional info
No response

Activity

agracia-foticos
added
enhancement
New feature or request
on Aug 14
joaopedrodcf
joaopedrodcf commented 2 days ago
joaopedrodcf
(João Ferreira)
2 days ago
What's the difference on the current behavior don't we always in compile time generate the bundle of the scripts marked with bundle ?
