// Spanish catalog. Keys are normalized English source strings; run
// tools/extract-strings.mjs to see what is missing or stale.

export const es = {
  "Skip to content": "Saltar al contenido",
  "A plain-language phone checkup.": "Una revisión del teléfono en lenguaje claro.",
  "Beta. Experts in domestic-violence tech safety have not reviewed Sweep yet, so treat it as one tool, not an authority.":
    "Beta. Expertos en seguridad tecnológica contra la violencia doméstica todavía no han revisado Sweep, así que trátalo como una herramienta más, no como una autoridad.",
  '"Is something on my phone watching me" is a normal question with a hard answer. Sweep checks the specific places surveillance apps live: the list of installed apps against publicly identified stalkerware, device admin powers, accessibility services that can read your screen, apps with no icon, and installs that came from outside any store. Then it explains every finding in words, not scores.':
    '"¿Hay algo en mi teléfono vigilándome?" es una pregunta normal con una respuesta difícil. Sweep revisa los lugares concretos donde vive el software de vigilancia: la lista de apps instaladas contra stalkerware identificado públicamente, los poderes de administrador del dispositivo, los servicios de accesibilidad que pueden leer tu pantalla, las apps sin icono y las instalaciones que llegaron de fuera de cualquier tienda. Y explica cada hallazgo con palabras, no con puntuaciones.',
  "Run the checkup": "Ejecutar la revisión",
  "Checking…": "Revisando…",
  "The checkup itself runs in the Android app, because a web page cannot and should not see your installed apps. This page explains how it works.":
    "La revisión en sí se ejecuta en la app de Android, porque una página web no puede ni debe ver tus apps instaladas. Esta página explica cómo funciona.",
  "Get the app": "Consigue la app",
  "Sweep for Android asks for one permission: the ability to list installed apps, which is the whole point. It has no internet permission, so what it sees cannot leave your phone, and it keeps no history of results.":
    "Sweep para Android pide un solo permiso: poder listar las apps instaladas, que es justamente el punto. No tiene permiso de internet, así que lo que ve no puede salir de tu teléfono, y no guarda historial de resultados.",
  "Download the APK": "Descargar el APK",
  "On an iPhone? That button will not help you: this checkup needs an Android-only permission that does not exist on iOS. The explanation on this page still applies to your phone; there is no working checkup to install yet.":
    "¿Tienes un iPhone? Ese botón no te va a servir: esta revisión necesita un permiso exclusivo de Android que no existe en iOS. La explicación de esta página se aplica igual a tu teléfono; todavía no hay una revisión que funcione para instalar.",
  "What it checks": "Lo que revisa",
  "Known stalkerware": "Stalkerware conocido",
  "Installed apps are compared against a public, maintained list of surveillance products, by package name and by signing certificate, so renamed copies still match.":
    "Las apps instaladas se comparan contra una lista pública y mantenida de productos de vigilancia, por nombre de paquete y por certificado de firma, de modo que las copias renombradas también coinciden.",
  "Device admins": "Administradores del dispositivo",
  "Apps with administrator power can lock the phone, wipe it, and resist removal. You should recognize every name on this list.":
    "Las apps con poder de administrador pueden bloquear el teléfono, borrarlo y resistirse a ser eliminadas. Deberías reconocer cada nombre de esta lista.",
  "Accessibility services": "Servicios de accesibilidad",
  "These services can read the screen and watch input. Wonderful for accessibility, and the favorite hiding place of watchers.":
    "Estos servicios pueden leer la pantalla y observar lo que escribes. Maravillosos para la accesibilidad, y el escondite favorito de los vigilantes.",
  "Hidden and sideloaded apps": "Apps ocultas e instaladas a mano",
  "Apps with no icon, and apps installed from outside any store. Plenty are legitimate; the point is that you get to look at the list.":
    "Apps sin icono, y apps instaladas fuera de cualquier tienda. Muchas son legítimas; el punto es que tú puedas mirar la lista.",
  "What Sweep will never tell you": "Lo que Sweep nunca te dirá",
  "That you are safe. A checkup can only report what its checks found, and sophisticated spyware works hard to fail them. Sweep says \"these specific checks found nothing\" and means exactly that, no more. If your gut says something is wrong, trust it over any app, this one included.":
    "Que estás a salvo. Una revisión solo puede informar de lo que sus comprobaciones encontraron, y el spyware sofisticado se esfuerza en esquivarlas. Sweep dice \"estas comprobaciones concretas no encontraron nada\" y quiere decir exactamente eso, nada más. Si tu instinto dice que algo va mal, confía en él por encima de cualquier app, esta incluida.",
  "If you are in danger": "Si estás en peligro",
  "If someone in your life may have put software on your phone, be careful with this checkup: removing an app or confronting the person can escalate things, and some spyware reports its own removal. Advocates who handle this every day can help you plan first. In the US: the National Domestic Violence Hotline, 1-800-799-7233, thehotline.org. Tech safety guides: techsafety.org. Worldwide: stopstalkerware.org lists local organizations.":
    "Si alguien de tu vida puede haber puesto software en tu teléfono, ten cuidado con esta revisión: eliminar una app o confrontar a la persona puede escalar la situación, y algunos spyware avisan de su propia eliminación. Quienes atienden estos casos a diario pueden ayudarte a planificar primero. En EE. UU.: la Línea Nacional contra la Violencia Doméstica, 1-800-799-7233, thehotline.org (tiene atención en español). Guías de seguridad tecnológica: techsafety.org. En el resto del mundo: stopstalkerware.org lista organizaciones locales.",
  "The \"Leave fast\" button in the corner works from every screen. It instantly switches this page to an ordinary weather site and clears whatever the checkup found, in case someone walks in.":
    "El botón \"Salir rápido\" de la esquina funciona desde cualquier pantalla. Cambia esta página al instante a un sitio normal del clima y borra lo que haya encontrado la revisión, por si alguien entra.",
  "Data sources": "Fuentes de datos",
  "The stalkerware list comes from the stalkerware-indicators dataset maintained by Echap (github.com/AssoEchap/stalkerware-indicators), licensed CC-BY 4.0, bundled with the app and refreshed each release. Echap does not endorse Sweep. Nothing is fetched at runtime, because the app cannot reach the network at all.":
    "La lista de stalkerware proviene del conjunto de datos stalkerware-indicators mantenido por Echap (github.com/AssoEchap/stalkerware-indicators), con licencia CC-BY 4.0, incluido en la app y actualizado en cada versión. Echap no respalda a Sweep. Nada se descarga en tiempo de ejecución, porque la app no puede acceder a la red en absoluto.",
  "Privacy": "Privacidad",
  "Language": "Idioma",
  "Leave fast": "Salir rápido",
  "Leave fast could not run in this build. Close the app by hand right now: swipe up from the bottom of the screen and swipe this app away.":
    "Salir rápido no pudo funcionar en esta versión. Cierra la app a mano ahora mismo: desliza hacia arriba desde abajo de la pantalla y quita esta app.",

  "Checkup results": "Resultados de la revisión",
  "Back": "Atrás",
  "Something here needs your attention. Read it calmly; there is advice below.":
    "Algo aquí necesita tu atención. Léelo con calma; hay consejos abajo.",
  "These specific checks found nothing. That is what it says, not a guarantee of safety.":
    "Estas comprobaciones concretas no encontraron nada. Eso es lo que dice, no una garantía de seguridad.",
  "Known surveillance apps": "Apps de vigilancia conocidas",
  "found: {count}": "encontradas: {count}",
  "none found": "ninguna",
  "Software publicly identified as stalkerware is installed on this phone. Take a breath before doing anything: if a person you know may have put it there, removing it or confronting them can escalate the situation, and some of these apps report their own removal. The advice below comes first.":
    "En este teléfono hay instalado software identificado públicamente como stalkerware. Respira antes de hacer nada: si una persona que conoces pudo haberlo puesto, eliminarlo o confrontarla puede escalar la situación, y algunas de estas apps avisan de su propia eliminación. Los consejos de abajo van primero.",
  "No installed app matched the public stalkerware list, by package name or by signing certificate.":
    "Ninguna app instalada coincidió con la lista pública de stalkerware, ni por nombre de paquete ni por certificado de firma.",
  "{label} ({pkg}): matches {family}, by {via}.": "{label} ({pkg}): coincide con {family}, por {via}.",
  "name": "nombre",
  "certificate": "certificado",
  "Show the matches": "Mostrar las coincidencias",
  "Device admin apps": "Apps administradoras del dispositivo",
  "Apps with administrator power can lock the phone, wipe it, and resist removal. Recognize every name here; your workplace or a family setup tool can be legitimate.":
    "Las apps con poder de administrador pueden bloquear el teléfono, borrarlo y resistirse a ser eliminadas. Reconoce cada nombre; tu trabajo o una herramienta de configuración familiar pueden ser legítimos.",
  "Show the device admin list": "Mostrar la lista de administradores del dispositivo",
  "Accessibility services, turned on": "Servicios de accesibilidad activados",
  "A service on this list can read the screen and watch what you type. Screen readers and automation tools belong here; anything you do not recognize deserves a hard look.":
    "Un servicio de esta lista puede leer la pantalla y observar lo que tecleas. Los lectores de pantalla y las herramientas de automatización tienen su lugar aquí; cualquier cosa que no reconozcas merece una mirada seria.",
  "This list only covers accessibility services. Screen mirroring, remote support tools, and someone simply looking at the screen leave nothing here to find.":
    "Esta lista solo cubre los servicios de accesibilidad. La duplicación de pantalla, las herramientas de soporte remoto y alguien simplemente mirando la pantalla no dejan nada que encontrar aquí.",
  "Show the accessibility services list": "Mostrar la lista de servicios de accesibilidad",
  "Apps without an icon": "Apps sin icono",
  "These installed apps have no launcher icon. Many are harmless helpers; hiding is also what surveillance apps do. Skim the names for anything you never installed.":
    "Estas apps instaladas no tienen icono en el lanzador. Muchas son ayudantes inofensivos; esconderse también es lo que hacen las apps de vigilancia. Repasa los nombres por si hay algo que nunca instalaste.",
  "Show the apps without an icon": "Mostrar las apps sin icono",
  "Installed from outside a store": "Instaladas fuera de una tienda",
  "These apps did not come from a recognized app store. Sideloading is normal for plenty of people; it is also the only way most stalkerware arrives. You should remember installing each of these.":
    "Estas apps no llegaron de una tienda reconocida. Instalar a mano es normal para mucha gente; también es como llega la mayoría del stalkerware. Deberías recordar haber instalado cada una.",
  "Show the apps installed outside a store": "Mostrar las apps instaladas fuera de una tienda",
  "Before acting on anything above": "Antes de actuar sobre nada de lo anterior",
  "If the person who might be watching is someone you know, talk to an advocate before removing anything: removal can be noticed. National Domestic Violence Hotline (US): 1-800-799-7233. Tech safety planning: techsafety.org. Local organizations worldwide: stopstalkerware.org.":
    "Si la persona que podría estar vigilando es alguien que conoces, habla con profesionales antes de eliminar nada: la eliminación puede notarse. Línea Nacional contra la Violencia Doméstica (EE. UU., con español): 1-800-799-7233. Planificación de seguridad tecnológica: techsafety.org. Organizaciones locales en el mundo: stopstalkerware.org.",
  "Nothing on this screen is saved. Leaving this page discards the results.":
    "Nada de esta pantalla se guarda. Al salir de esta página, los resultados se descartan.",
  "Run it again": "Ejecutarla otra vez",
  "The checkup could not run. Report it: Munzzyy1@proton.me or github.com/munzzyy/sweep/issues.":
    "La revisión no pudo ejecutarse. Repórtalo: Munzzyy1@proton.me o github.com/munzzyy/sweep/issues.",
  "Nothing matched the known stalkerware list. The lists below need your eyes: only you know what belongs on this phone.":
    "Nada coincidió con la lista de stalkerware conocido. Las listas de abajo necesitan tus ojos: solo tú sabes qué pertenece a este teléfono.",
  "The detection data could not load; the checkup cannot run. Reinstall the app.":
    "Los datos de detección no se pudieron cargar; la revisión no puede ejecutarse. Reinstala la app.",
  "The detection data could not load; the checkup cannot run. Reload the page.":
    "Los datos de detección no se pudieron cargar; la revisión no puede ejecutarse. Recarga la página.",
  "This list is dated {date}.": "Esta lista tiene fecha del {date}.",
  "This list is dated {date} and has not been refreshed since. Treat a clean result here a little more cautiously.":
    "Esta lista tiene fecha del {date} y no se ha actualizado desde entonces. Toma un resultado limpio aquí con un poco más de cautela.",
  "Installed {date}, from {installer}.": "Instalada el {date}, desde {installer}.",
  "an unrecorded date": "una fecha no registrada",
  "an unknown source": "una fuente desconocida",
  "device admin power, which can resist being uninstalled until that access is turned off first":
    "poder de administrador del dispositivo, que puede resistirse a ser desinstalada hasta que ese acceso se desactive primero",
  "an enabled accessibility service, which can read the screen":
    "un servicio de accesibilidad activado, que puede leer la pantalla",
  "notification access, which can read incoming notifications":
    "acceso a notificaciones, que puede leer las notificaciones que llegan",
  "It also holds: {powers}.": "También tiene: {powers}.",
  "{flagged} of {total} checks have something to look at.": "{flagged} de {total} comprobaciones tienen algo que revisar.",
  "Apps that can read notifications": "Apps que pueden leer notificaciones",
  "Apps on this list see the content of every notification that arrives on this phone. Smartwatches, notification-mirroring apps, and Do Not Disturb rules use this legitimately; anything you do not recognize deserves a hard look.":
    "Las apps de esta lista ven el contenido de cada notificación que llega a este teléfono. Los relojes inteligentes, las apps que reflejan notificaciones y las reglas de No Molestar usan este permiso legítimamente; cualquier cosa que no reconozcas merece una mirada seria.",
  "Show the notification-access list": "Mostrar la lista de acceso a notificaciones",
  "Check Sweep itself": "Revisa a Sweep mismo",
  "has internet": "tiene internet",
  "no internet": "sin internet",
  "Sweep's own permissions include internet access, which contradicts what this app tells you. Do not trust this build; get Sweep from the official release page instead.":
    "Los permisos de Sweep incluyen acceso a internet, lo cual contradice lo que esta app te dice. No confíes en esta versión; consigue Sweep desde la página oficial de versiones.",
  "Sweep just asked Android for its own permission list, the same way it asked for yours: no internet access is requested, so nothing this checkup sees can leave this phone. That is not a claim, it is what the phone just reported.":
    "Sweep acaba de pedirle a Android su propia lista de permisos, igual que pidió la tuya: no solicita acceso a internet, así que nada de lo que ve esta revisión puede salir de este teléfono. Eso no es una afirmación, es lo que el teléfono acaba de reportar.",
  "Show Sweep's own permissions": "Mostrar los propios permisos de Sweep",

  "Read this first": "Lee esto primero",
  "An app on this phone can read the screen as text right now, because accessibility access is turned on for it. That means the checkup results below could be visible to it too.":
    "Una app en este teléfono puede leer la pantalla como texto ahora mismo, porque tiene activado el acceso de accesibilidad. Eso significa que los resultados de esta revisión también podrían ser visibles para ella.",
  "Screen readers and voice controls need this access, and so do plenty of ordinary automation apps. Sweep only recognizes a couple of screen readers by name; anything else on this phone will need your own judgment. Continuing will show you its name in the accessibility list.":
    "Los lectores de pantalla y los controles por voz necesitan este acceso, igual que muchas apps de automatización comunes. Sweep solo reconoce por nombre un par de lectores de pantalla; cualquier otra cosa en este teléfono necesitará tu propio criterio. Si continúas, verás su nombre en la lista de accesibilidad.",
  "See the results": "Ver los resultados",
};
