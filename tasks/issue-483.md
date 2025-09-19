Types of all keys in scripts.registry inferred as any in nuxt.config.ts in Nuxt 4 tsconfig setup #483
Open
Open
Types of all keys in scripts.registry inferred as any in nuxt.config.ts in Nuxt 4 tsconfig setup
#483
@benedictleejh
Description
benedictleejh
(Benedict Lee)
opened on Aug 7
🐛 The bug
When trying to setup scripts in Nuxt config, all keys inside the registry config key are being inferred as any by TypeScript:

Image
🛠️ To reproduce
stackblitz.com/edit/nuxt-starter-wqfrm3oc?file=nuxt.config.ts

🌈 Expected behavior
The types should be properly inferred as per the type definitions provided by Nuxt Scripts.

ℹ️ Additional context
I can consistently replicate this locally on Windows, Mac, and Linux (WSL OpenSUSE Tumbleweed), but for some reason, the types work on StackBlitz. I have tried switching to pnpm 8 locally to match StackBlitz, but the types are still being inferred as any.

The StackBlitz project, and all my attempted local reproductions were created from the minimal Nuxt starter, with the Nuxt Scripts module added; the Nuxt Scripts starter in StackBlitz refused to provide me with types on hover.

This was seen using Nuxt 4.0.3, TypeScript 5.9.2, pnpm 10.14.0.

I could just be missing some configuration somewhere, but I can't figure out how the StackBlitz and local repos are different.

Activity

benedictleejh
added
bug
Something isn't working
on Aug 7
joaopedrodcf
joaopedrodcf commented 2 days ago
joaopedrodcf
(João Ferreira)
2 days ago
Hey @benedictleejh,

Checked stackblitz and its as you say it does work there I it also works on my projects )

Did you tried to create a new project on your local machine with the same code as in stackblitz ? If it does work after that should be smth related with your project setup.

Some ideas that may help

Maybe try delete the pnpm.lock and install again.
Maybe delete the cache
git clean local only files like node modules and try pnpm install again

benedictleejh
benedictleejh commented yesterday
benedictleejh
(Benedict Lee)
yesterday · edited by benedictleejh
Author
Ah, I figured it out. The stackblitz uses the old Nuxt root tsconfig where it extended .nuxt/tsconfig.json, whereas my reproductions were based on the new Nuxt 4 tsconfig, as I created a new Nuxt 4 project for them: nuxt/starter@v4/tsconfig.json. So the problem is reduced now to the types not working in the new Nuxt 4 tsconfig.

After some testing, it seems the key is these lines in tsconfig:

"#nuxt-scripts/*": [
"../node_modules/.pnpm/@nuxt+scripts@0.11.10_@unhe_df90e380bb1753ca9de77cea7c1c8b00/node_modules/@nuxt/scripts/dist/runtime/*"
],
After adding these lines to tsconfig.node.json (which is the tsconfig context for nuxt.config.ts), the types work. That said, it's probably best for Nuxt scripts to add all of its types that are appropriate to Nuxt's node context, as other things could be different as well, just not surfaced as an issue yet.

I'll update the title for the issue so its more clear what the cause is.

