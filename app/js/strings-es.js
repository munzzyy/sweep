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
  "This list is dated {date} and has not been refreshed since. Treat a no-matches result here a little more cautiously.":
    "Esta lista tiene fecha del {date} y no se ha actualizado desde entonces. Toma un resultado sin coincidencias aquí con un poco más de cautela.",
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

  "What this checkup could actually see": "Lo que esta revisión pudo ver realmente",
  "{checked} of {total}": "{checked} de {total}",
  "This checkup read {checked} of the {total} surfaces it knows about on this phone. What it could not read is listed here with the reason; an unreadable surface is an unknown, never good news or bad news.":
    "Esta revisión leyó {checked} de las {total} superficies que conoce en este teléfono. Lo que no pudo leer está listado aquí con la razón; una superficie ilegible es una incógnita, nunca una buena ni una mala noticia.",
  "Show what could not be checked ({count})": "Mostrar lo que no se pudo comprobar ({count})",
  "Android only exposes this to privileged system apps": "Android solo expone esto a apps privilegiadas del sistema",
  "this scan did not report it; the app that ran the scan is older than this check":
    "esta exploración no lo informó; la app que la ejecutó es más antigua que esta comprobación",
  "the installed app list": "la lista de apps instaladas",
  "active device admin apps": "las apps administradoras del dispositivo activas",
  "the powers each device admin declares": "los poderes que declara cada administrador del dispositivo",
  "enabled accessibility services, from the settings record": "los servicios de accesibilidad activados, según el registro de ajustes",
  "what each enabled accessibility service can do": "qué puede hacer cada servicio de accesibilidad activado",
  "apps with notification access": "las apps con acceso a notificaciones",
  "which sensitive permissions each app actually holds": "qué permisos sensibles tiene realmente cada app",
  "declared background services and boot receivers": "los servicios en segundo plano declarados y los receptores de arranque",
  "where each app was installed from": "de dónde se instaló cada app",
  "enabled keyboards": "los teclados habilitados",
  "which keyboard is active": "qué teclado está activo",
  "certificate authorities a person added to this phone": "las autoridades de certificación que una persona añadió a este teléfono",
  "which app handles text messages": "qué app gestiona los mensajes de texto",
  "which app handles calls": "qué app gestiona las llamadas",
  "which app acts as the assistant": "qué app actúa como asistente",
  "battery optimization exemptions": "las exenciones de optimización de batería",
  "device owner, profile owner, and work profile": "propietario del dispositivo, propietario de perfil y perfil de trabajo",
  "USB debugging and developer settings": "la depuración USB y los ajustes de desarrollador",
  "apps that can run a VPN": "las apps que pueden ejecutar una VPN",
  "the always-on VPN setting": "el ajuste de VPN siempre activa",
  "which apps were granted usage access": "a qué apps se les concedió el acceso de uso",
  "which apps were granted draw-over-other-apps": "a qué apps se les concedió dibujar sobre otras apps",
  "which apps were granted install-unknown-apps": "a qué apps se les concedió instalar apps desconocidas",

  "This app is signed with a certificate that appears in the public stalkerware indicator list, under the family {family}.":
    "Esta app está firmada con un certificado que aparece en la lista pública de indicadores de stalkerware, bajo la familia {family}.",
  "This app's package name and its signing certificate both match the stalkerware family {family} on the public indicator list.":
    "El nombre de paquete de esta app y su certificado de firma coinciden ambos con la familia de stalkerware {family} de la lista pública de indicadores.",
  "This app's package name matches one documented for the stalkerware family {family}. A package name alone can be reused by an unrelated app, and the signing certificate here did not also match, so hold that doubt while you read this.":
    "El nombre de paquete de esta app coincide con uno documentado para la familia de stalkerware {family}. Un nombre de paquete por sí solo puede ser reutilizado por una app sin relación, y aquí el certificado de firma no coincidió también, así que mantén esa duda mientras lees esto.",
  "This app's package name starts with a prefix documented for the stalkerware family {family}. A name prefix is weak evidence on its own; this is shown because the app also holds real power on this phone.":
    "El nombre de paquete de esta app empieza con un prefijo documentado para la familia de stalkerware {family}. Un prefijo de nombre es evidencia débil por sí solo; esto se muestra porque la app además tiene poder real en este teléfono.",
  "{label} is commonly marketed for parental or partner monitoring. It does not appear on the stalkerware-indicator list checked here, and its presence alone does not mean misuse.":
    "{label} se comercializa habitualmente para el monitoreo parental o de pareja. No aparece en la lista de indicadores de stalkerware consultada aquí, y su presencia por sí sola no significa un mal uso.",
  "This app names itself like a system app ({prefix}) but Android does not record it as part of the system and it was not installed by the Play Store; an app updated through a manufacturer's own store can look the same way, so treat this as something to check, not proof.":
    "Esta app se nombra como una app del sistema ({prefix}) pero Android no la registra como parte del sistema y no la instaló la Play Store; una app actualizada por la tienda propia del fabricante puede verse igual, así que trátalo como algo para comprobar, no como una prueba.",
  "This app arrived from outside any store this scan recognizes, has no icon in the launcher, is set up to keep running, and can {access}; some device management and backup tools legitimately look the same, so the question is whether you know what this app is.":
    "Esta app llegó de fuera de cualquier tienda que esta revisión reconozca, no tiene icono en el lanzador, está preparada para seguir ejecutándose y puede {access}; algunas herramientas de gestión de dispositivos y de copias de seguridad se ven igual de forma legítima, así que la pregunta es si sabes qué es esta app.",

  "Monitoring apps sold openly": "Apps de monitoreo vendidas abiertamente",
  "Apps in this section are sold openly for keeping an eye on someone's phone, usually marketed to parents or partners. They are not on the stalkerware list this checkup uses, and one being installed does not by itself mean misuse; the question only you can answer is whether you knew it was here.":
    "Las apps de esta sección se venden abiertamente para vigilar el teléfono de alguien, normalmente dirigidas a padres o parejas. No están en la lista de stalkerware que usa esta revisión, y que una esté instalada no significa por sí solo un mal uso; la pregunta que solo tú puedes responder es si sabías que estaba aquí.",
  "Patterns worth a second look": "Patrones que merecen una segunda mirada",
  "Nothing in this section matched any list. These are combinations of facts that surveillance tools tend to use and that some legitimate tools share; each card says exactly which pattern fired and why.":
    "Nada de esta sección coincidió con ninguna lista. Son combinaciones de hechos que las herramientas de vigilancia suelen usar y que algunas herramientas legítimas comparten; cada tarjeta dice exactamente qué patrón se activó y por qué.",

  "On this phone right now, Android reports this app can: {powers}.":
    "En este teléfono ahora mismo, Android informa que esta app puede: {powers}.",
  "Show the raw evidence": "Mostrar la evidencia en bruto",
  "Check it yourself (menu names vary by phone): {path}":
    "Compruébalo tú (los nombres de los menús varían según el teléfono): {path}",
  "Careful before acting: a person who installed a monitoring app can sometimes tell when it is found or removed. Plan your safety first; techsafety.org has guides written for exactly this.":
    "Cuidado antes de actuar: una persona que instaló una app de monitoreo a veces puede notar cuando se encuentra o se elimina. Planifica tu seguridad primero; techsafety.org tiene guías escritas exactamente para esto.",
  "Last updated {date}.": "Última actualización el {date}.",
  "The install was started by {pkg}.": "La instalación la inició {pkg}.",
  "Android recorded the install as coming from {type}.": "Android registró que la instalación vino de {type}.",
  "an app store": "una tienda de apps",
  "a local file": "un archivo local",
  "a downloaded file": "un archivo descargado",
  "another source": "otra fuente",
  "Settings > Apps > All apps": "Ajustes > Aplicaciones > Ver todas las apps",
  "Settings > Security > Device admin apps": "Ajustes > Seguridad > Apps de administración del dispositivo",
  "Settings > Accessibility": "Ajustes > Accesibilidad",
  "Settings > Apps > Special app access > Notification access": "Ajustes > Aplicaciones > Acceso especial de apps > Acceso a notificaciones",
  "Settings > System > Keyboard": "Ajustes > Sistema > Teclado",
  "Settings > Security > Encryption and credentials > Trusted credentials": "Ajustes > Seguridad > Cifrado y credenciales > Credenciales de confianza",
  "Settings > Network and internet > VPN": "Ajustes > Red e internet > VPN",
  "Settings > Apps > Default apps": "Ajustes > Aplicaciones > Apps predeterminadas",
  "Settings > Security": "Ajustes > Seguridad",
  "Settings > System > Developer options": "Ajustes > Sistema > Opciones de desarrollador",
  "rule fired": "regla activada",
  "This app starts when the phone boots and declares a background service typed for {sensors}; media, navigation, and assistant apps legitimately do the same, so check that you recognize it.":
    "Esta app se inicia cuando el teléfono arranca y declara un servicio en segundo plano tipado para {sensors}; las apps de música, navegación y asistente hacen lo mismo legítimamente, así que comprueba que la reconoces.",
  "the microphone": "el micrófono",
  "the camera": "la cámara",
  "location": "la ubicación",
  "The battery exemption read here is Android's own list; some phone brands keep a separate allowlist this scan cannot see, so not exempt here proves nothing either way.":
    "La exención de batería que se lee aquí es la lista propia de Android; algunas marcas de teléfonos mantienen una lista aparte que esta revisión no puede ver, así que no exenta aquí no prueba nada en ningún sentido.",

  "Could not read this admin's declared powers.": "No se pudieron leer los poderes que declara este administrador.",
  "It declares the power to: {powers}.": "Declara el poder de: {powers}.",
  "erase this phone remotely": "borrar este teléfono de forma remota",
  "lock the screen at will": "bloquear la pantalla a voluntad",
  "change the unlock password": "cambiar la contraseña de desbloqueo",
  "watch failed unlock attempts": "vigilar los intentos fallidos de desbloqueo",
  "turn the camera off phone-wide": "apagar la cámara en todo el teléfono",

  "Android says this service can: {things}.": "Android dice que este servicio puede: {things}.",
  "It applies to every app on this phone.": "Se aplica a todas las apps de este teléfono.",
  "It applies only to: {pkgs}.": "Se aplica solo a: {pkgs}.",
  "Two OS records of enabled accessibility services disagree on this phone; both are shown, and the mismatch itself deserves attention.":
    "Dos registros del sistema sobre los servicios de accesibilidad activados no coinciden en este teléfono; se muestran ambos, y ese desajuste merece atención por sí mismo.",
  "read what is on the screen": "leer lo que hay en la pantalla",
  "perform taps and swipes by itself": "hacer toques y deslizamientos por sí mismo",
  "watch keys as they are pressed": "observar las teclas según se pulsan",
  "control screen magnification": "controlar la ampliación de la pantalla",
  "take screenshots": "hacer capturas de pantalla",
  "see text as it is typed": "ver el texto mientras se escribe",

  "Keyboards in use": "Teclados en uso",
  "A keyboard sees everything typed with it, in every app: messages, searches, passwords. The phone's own keyboard belongs here; a keyboard you do not remember choosing deserves a hard look.":
    "Un teclado ve todo lo que se escribe con él, en cualquier app: mensajes, búsquedas, contraseñas. El teclado propio del teléfono tiene su lugar aquí; un teclado que no recuerdas haber elegido merece una mirada seria.",
  "Show the enabled keyboards": "Mostrar los teclados habilitados",
  "This is the keyboard in use right now.": "Este es el teclado en uso ahora mismo.",

  "Certificate authorities added by a person": "Autoridades de certificación añadidas por una persona",
  "A certificate authority someone added lets whoever controls it inspect this phone's secure traffic in some setups. Workplaces add these for device management; so do some filtering and monitoring tools. A work profile keeps a separate list this scan cannot see.":
    "Una autoridad de certificación que alguien añadió permite a quien la controla inspeccionar el tráfico seguro de este teléfono en algunas configuraciones. Los trabajos las añaden para gestionar dispositivos; también lo hacen algunas herramientas de filtrado y monitoreo. Un perfil de trabajo mantiene una lista separada que esta revisión no puede ver.",
  "Show the added certificate authorities": "Mostrar las autoridades de certificación añadidas",
  "Trusted: {subject}. Issued by {issuer}. Valid {from} to {to}.":
    "De confianza: {subject}. Emitido por {issuer}. Válido del {from} al {to}.",

  "Apps that can run a VPN": "Apps que pueden ejecutar una VPN",
  "An app that runs a VPN can route this phone's traffic through itself. A VPN you chose is normal; one that is hidden or arrived from outside a store deserves a hard look.":
    "Una app que ejecuta una VPN puede dirigir el tráfico de este teléfono a través de sí misma. Una VPN que tú elegiste es normal; una que está oculta o llegó de fuera de una tienda merece una mirada seria.",
  "Show the VPN-capable apps": "Mostrar las apps con capacidad de VPN",
  "Android reports an always-on VPN is set: {pkg}.": "Android informa que hay una VPN siempre activa configurada: {pkg}.",
  "It has no launcher icon.": "No tiene icono en el lanzador.",
  "It did not come from a recognized store.": "No llegó de una tienda reconocida.",

  "Default app roles": "Apps predeterminadas",
  "The default SMS app sees every text message, including security codes, and the default dialer handles every call. These should be apps you recognize and chose.":
    "La app de SMS predeterminada ve cada mensaje de texto, incluidos los códigos de seguridad, y el marcador predeterminado gestiona cada llamada. Deberían ser apps que reconoces y elegiste.",
  "Show the role holders": "Mostrar qué apps tienen cada rol",
  "Text messages are handled by {label} ({pkg}).": "Los mensajes de texto los gestiona {label} ({pkg}).",
  "That app is not part of the phone's system image; every text, including security codes, goes through it.":
    "Esa app no es parte del sistema del teléfono; cada mensaje, incluidos los códigos de seguridad, pasa por ella.",
  "Calls are handled by {label} ({pkg}).": "Las llamadas las gestiona {label} ({pkg}).",
  "That app is not part of the phone's system image.": "Esa app no es parte del sistema del teléfono.",
  "The assistant role is held by {value}.": "El rol de asistente lo tiene {value}.",

  "Who controls this phone": "Quién controla este teléfono",
  "A device owner or profile owner can set policy, install and remove apps, and read device state on the side it manages. Employers use this legitimately every day; on a personal phone it deserves a hard look.":
    "Un propietario del dispositivo o de un perfil puede fijar políticas, instalar y eliminar apps, y leer el estado del dispositivo en el lado que gestiona. Los empleadores lo usan legítimamente a diario; en un teléfono personal merece una mirada seria.",
  "Show the management facts": "Mostrar los datos de gestión",
  "{label} ({pkg}) is the device owner, the strongest control Android grants; it can set policy for this whole phone. Work phones are commonly set up this way.":
    "{label} ({pkg}) es el propietario del dispositivo, el control más fuerte que concede Android; puede fijar políticas para todo este teléfono. Los teléfonos de trabajo suelen configurarse así.",
  "{label} ({pkg}) manages a profile on this phone.": "{label} ({pkg}) gestiona un perfil en este teléfono.",
  "A work profile exists on this phone. Its manager can see and control the work side; this checkup runs on the personal side and cannot see into the work side.":
    "Existe un perfil de trabajo en este teléfono. Quien lo gestiona puede ver y controlar el lado de trabajo; esta revisión se ejecuta en el lado personal y no puede ver dentro del lado de trabajo.",

  "Debugging switches": "Interruptores de depuración",
  "Debugging switches let a trusted computer install apps and change settings. Developers leave these on for themselves all the time; if nobody who uses this phone is one, ask why they are on.":
    "Los interruptores de depuración permiten que una computadora de confianza instale apps y cambie ajustes. Los desarrolladores los dejan activados para sí mismos todo el tiempo; si nadie que use este teléfono lo es, pregúntate por qué están activados.",
  "Show the debugging switches": "Mostrar los interruptores de depuración",
  "USB debugging is turned on. A computer this phone trusts can install apps and change settings over a cable.":
    "La depuración USB está activada. Una computadora en la que este teléfono confía puede instalar apps y cambiar ajustes por cable.",
  "Wireless debugging is turned on, which allows the same control over Wi-Fi.":
    "La depuración inalámbrica está activada, lo que permite el mismo control por Wi-Fi.",
  "Developer options are turned on.": "Las opciones de desarrollador están activadas.",

  "package": "paquete",
  "app label": "nombre visible de la app",
  "system app": "app del sistema",
  "installer": "instalador",
  "install started by": "instalación iniciada por",
  "install source type": "tipo de fuente de instalación",
  "installed": "instalada",
  "last updated": "última actualización",
  "targets Android API": "apunta a la API de Android",
  "shared user id": "id de usuario compartido",
  "debuggable build": "compilación depurable",
  "matched family": "familia coincidente",
  "matched by": "coincidió por",
  "matching certificate SHA-1": "SHA-1 del certificado coincidente",
  "also sold as": "también vendida como",
  "certificate registered to": "certificado registrado a nombre de",
  "list entry type": "tipo de entrada en la lista",

  "use the microphone": "usar el micrófono",
  "use the camera": "usar la cámara",
  "read the phone's precise location": "leer la ubicación precisa del teléfono",
  "read the phone's approximate location": "leer la ubicación aproximada del teléfono",
  "read the location while in the background": "leer la ubicación estando en segundo plano",
  "read text messages": "leer los mensajes de texto",
  "see text messages as they arrive": "ver los mensajes de texto cuando llegan",
  "read the call history": "leer el historial de llamadas",
  "see outgoing calls": "ver las llamadas salientes",
  "read the contact list": "leer la lista de contactos",
  "read the phone's identity and call state": "leer la identidad del teléfono y el estado de las llamadas",
  "read the calendar": "leer el calendario",
  "post notifications": "publicar notificaciones",
  "ask to track which apps get used; whether that was granted could not be checked here":
    "pedir rastrear qué apps se usan; si eso se concedió no se pudo comprobar aquí",
  "ask to draw over other apps; whether that was granted could not be checked here":
    "pedir dibujar sobre otras apps; si eso se concedió no se pudo comprobar aquí",
  "ask to install other apps; whether that was granted could not be checked here":
    "pedir instalar otras apps; si eso se concedió no se pudo comprobar aquí",
  "ask for access to all files; whether that was granted could not be checked here":
    "pedir acceso a todos los archivos; si eso se concedió no se pudo comprobar aquí",
  "start itself when the phone boots": "iniciarse sola cuando el teléfono arranca",
  "keep running with battery optimization switched off for it":
    "seguir ejecutándose con la optimización de batería desactivada para ella",
  "read the screen through an enabled accessibility service": "leer la pantalla a través de un servicio de accesibilidad activado",
  "read incoming notifications": "leer las notificaciones que llegan",
  "act as a device administrator": "actuar como administrador del dispositivo",
  "run a long-lived background service typed for location": "ejecutar un servicio persistente en segundo plano tipado para ubicación",
  "run a long-lived background service typed for the camera": "ejecutar un servicio persistente en segundo plano tipado para la cámara",
  "run a long-lived background service typed for the microphone": "ejecutar un servicio persistente en segundo plano tipado para el micrófono",
  "run a long-lived background service typed for screen capture": "ejecutar un servicio persistente en segundo plano tipado para captura de pantalla",
  "run a long-lived background service typed for calls": "ejecutar un servicio persistente en segundo plano tipado para llamadas",
};
