bundle: true does not automatically inject bundled script nor update src, and this is undocumented #466
Open
Open
bundle: true does not automatically inject bundled script nor update src, and this is undocumented
#466
@agracia-foticos
Description
agracia-foticos
(Alberto Gracia)
opened on Jun 11
🐛 The bug
When using useScript() with the bundle: true option, the documentation implies that the script will be bundled and served from the local domain automatically — but this does not happen.

Instead, the script is still loaded from the original external URL unless the developer manually uses proxy.src and injects their own <script> tag.

This behavior is not mentioned in the documentation and leads to confusion. Developers assume bundle: true will change the src or handle injection automatically (like Nuxt's useHead() or useSeoMeta() do).

🛠️ To reproduce
stackblitz.com/edit/nuxt-starter-invmavzj?file=app.vue

🌈 Expected behavior
Either:

bundle: true should automatically replace the src with the local bundled version, or

The documentation should clearly explain that developers must use proxy.src manually.

ℹ️ Additional context
Add a note to the API docs under bundle explaining that:

"Using bundle: true does not automatically change the script's src. You must use the src returned by useScript() if you want to load the locally bundled version."

Optional: Provide a config like inject: true to automate this behavior (similar to how useHead() works).

Activity

agracia-foticos
added
bug
Something isn't working
on Jun 11
agracia-foticos
agracia-foticos commented on Jun 11
agracia-foticos
(Alberto Gracia)
on Jun 11
Author
Image
In run dev, but we have 3 useScripts and bundle:true

agracia-foticos
agracia-foticos commented on Jun 11
agracia-foticos
(Alberto Gracia)
on Jun 11
Author
in run prod

Image

agracia-foticos
agracia-foticos commented on Jun 11
agracia-foticos
(Alberto Gracia)
on Jun 11
Author
I have problems with this way

`



<script setup lang="ts"> const { var } = useRuntimeConfig().public; useScript({ src : `https://widgets.trustedshops.com/js/${var}.js`, defer : true, async:true, }) </script>
`

harlan-zw
harlan-zw commented on Jun 11
harlan-zw
on Jun 11 · edited by harlan-zw
Member
This sounds like a bug as this is what it should be doing.

Maybe also a bug with it working in dev

joaopedrodcf
joaopedrodcf commented 2 days ago
joaopedrodcf
(João Ferreira)
2 days ago
I have problems with this way

`

<script setup lang="ts"> const { var } = useRuntimeConfig().public; useScript({ src : `https://widgets.trustedshops.com/js/${var}.js`, defer : true, async:true, }) </script>
`

This example wouldn't;t work with the bundle option, as far as I tested bundle option only works when you have a full url without variables

This doesn't work as there is a variable interpolating

<script setup lang="ts"> 
const { var } = useRuntimeConfig().public; 

useScript({ src : `https://widgets.trustedshops.com/js/${var}.js`, defer : true, async:true, }) 
</script>
This works without the interpolation

<script setup lang="ts"> 
useScript({ src : 'https://widgets.trustedshops.com/js/example.js', defer : true, async:true, }) 
</script>
So basically as far as I know if you have a script that requires interpolation ( example different scripts per country wouldn't work )

Maybe a solution right now would be replicate the useScript with the different urls per country but that would be too much or @nuxt/scripts needs to provide a way to bundle it even if there is interpolation ( the hard thing is how nuxt scripts knows al the possibilities to generate all those different scripts )

@harlan-zw
