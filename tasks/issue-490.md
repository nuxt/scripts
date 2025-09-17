Load GTAG ID by domain or language #490
Open
@EduardoMateos
Description
EduardoMateos
(Eduardo Mateos Soto)
opened 3 weeks ago
📚 Is your documentation request related to a problem?
Hi, I have a multi-language app and I want to globally load a different gtag depending on the language.

I use different domains, each domain with its own language, in i18n.

Do you have any idea how I can do this? I can’t find the right solution.

thanks!

🔍 Where should you find it?
No response

ℹ️ Additional context
No response

Activity

EduardoMateos
added
documentation
Improvements or additions to documentation
3 weeks ago
joaopedrodcf
joaopedrodcf commented 2 days ago
joaopedrodcf
(João Ferreira)
2 days ago
Hey @EduardoMateos,

in a vue component


// Get the country
const currentCountry = useCurrentCountry()

// Map of id to country can be done in a config file as well
const gtagPerCountry = {
'pt-pt': 'XXX',
'fr-fr': 'YYY',
...
}


const googleAnalytics = useScriptGoogleAnalytics({
id: gtagPerCountry[currentCountry]
})
Wouldn't smth like this work for you ?
