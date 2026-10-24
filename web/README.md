# MazterLag · Sitio web (modelo piloto)

Sitio estático en HTML, CSS y JavaScript puro. Sin frameworks ni compilación: cada tipo de archivo está en su carpeta y no hay nada embebido (ni estilos, ni scripts, ni imágenes en base64).

## Reservas hoy
El botón «Reservar en Turnito» de `coaching.html` lleva a https://turnito.app. Reemplazá ese enlace por el de reservas propio de MazterLag en Turnito (está en `coaching.html`, es el único). La agenda propia (con pago y confirmación) queda guardada en `futuro/` para cuando se desarrolle el calendario propio; ninguna página del sitio la enlaza.

## Enlaces oficiales
Discord https://discord.gg/XebU8vQu2F · Instagram https://www.instagram.com/mazter_lag · YouTube https://www.youtube.com/@mazter_lag · TikTok https://www.tiktok.com/@mazter_lag · Reservas https://turnito.app/n/w83315g6l0rxq5n0.
Están en los HTML (menú, pie, inicio y coaching) y también en `js/config.js`. Con backend se leen de `GET /api/enlaces`, así que se cambian en un solo lugar (el `.env` del backend).

## Conexión con el backend
El sitio funciona **con o sin backend**. En `js/config.js`:
- `apiBase: null` → usa los datos de `js/data.js` (modo actual, no necesita servidor).
- `apiBase: ''` o una URL → trae guías, builds, publicaciones reales de Instagram, miembros de Discord y enlaces del backend (carpeta `mazterlag-backend`). Si la API no responde, vuelve solo a los datos locales.

## Subir el sitio a un hosting (primera vez)
El proyecto tiene **dos partes** que van en lugares distintos:
1. **El sitio** (`mazterlag-web`): son archivos estáticos (HTML, CSS, JS e imágenes). Funciona en cualquier hosting.
   - *Con panel tipo cPanel/Hostinger:* «Administrador de archivos» → carpeta `public_html` → «Subir» → subí **el contenido** de la carpeta (no la carpeta en sí) y dejá `.htaccess` incluido.
   - *Con Netlify o Cloudflare Pages:* arrastrás la carpeta en su página y listo (`_headers` ya viene incluido).
2. **El backend** (`mazterlag-backend`): necesita un hosting que ejecute **Node.js** (Render, Railway, Fly.io, un VPS, o el plan Node de algunos hostings). Un hosting compartido solo de PHP **no** lo puede correr.
   Cuando esté en línea, en `js/config.js` del sitio poné `apiBase: 'https://tu-backend.com'` y volvé a subir ese archivo.

**Sin backend** el sitio igual funciona con los datos de `js/data.js`; en ese caso las imágenes se cambian reemplazando los archivos de `assets/img/` por otros **con el mismo nombre** (y recargando con Ctrl+F5).

## Cambiar guías, builds e imágenes (con backend)
Entrá a `tu-sitio.com/admin.html` con la clave de administración. Ahí cargás, editás, ocultás y borrás guías (con su PDF y portada) y builds, y manejás las publicaciones de Instagram. No hace falta subir archivos al hosting a mano. `admin.html` no está enlazada en el sitio y no aparece en Google.

## Seguridad al publicar
- `.htaccess` (Apache) y `_headers` (Netlify/Cloudflare) agregan HTTPS forzado y las cabeceras de seguridad. Si el backend está en otro dominio, editá `connect-src` en ese archivo.
- El **link de pago de Turnito está fijo en `coaching.html`**: no sale de la API ni de ninguna configuración, así que solo se cambia editando ese archivo en el hosting. Quien pueda entrar al hosting puede cambiarlo, así que lo importante es **proteger los accesos**:
  - Verificación en dos pasos (2FA) en: hosting, registro del dominio, correo del dominio, Turnito, Mercado Pago, Meta/Instagram y las cuentas de Discord de quienes administran.
  - Contraseñas largas y distintas en cada servicio (con un gestor de contraseñas). No pasarlas por chat.
  - Subir archivos por SFTP, nunca por FTP común. Un usuario por persona; quitar el acceso a quien se va del proyecto.
  - Activar el bloqueo de transferencia del dominio y poner el DNS detrás de un servicio con 2FA (por ejemplo Cloudflare).
  - Guardar el `ADMIN_TOKEN` solo en el panel del hosting del backend y cambiarlo si alguien con acceso se va.
  - Hacer copia de seguridad del sitio, de `data/` y de `uploads/`, y revisar de vez en cuando que «Reservar en Turnito» siga apuntando al link correcto.
- Las redes (Discord, Instagram, YouTube, TikTok) solo aceptan enlaces https a esos mismos sitios.

## Cómo verlo
- Abrí `index.html` con doble clic, o
- levantá un servidor local (recomendado): `python3 -m http.server 8000` y entrá a `http://localhost:8000`.
- Las tipografías (Outfit y Source Sans 3) se cargan desde Google Fonts, por lo que hace falta internet. Sin conexión se ven con una fuente del sistema.

## Estructura
```
mazterlag-web/
├─ index.html        Inicio (vidriera: frase, accesos, posts de Instagram)
├─ guias.html        Biblioteca de guías (búsqueda + filtros por rol, campeón y tipo)
├─ builds.html       Biblioteca de builds (igual que guías)
├─ detalle.html      Página de una guía o build: detalle.html?tipo=guias&id=irelia
├─ coaching.html     Qué incluye, para quién es, precio y botón que lleva a Turnito
├─ nosotros.html     Qué somos, hacia dónde vamos y equipo
├─ admin.html        Panel de administración (guías con PDF, builds, Instagram)
├─ .htaccess         Seguridad para hostings Apache
├─ _headers          Seguridad para Netlify / Cloudflare Pages
├─ futuro/
│  ├─ agenda.html     Agenda propia (horario → datos → pago → confirmación). NO está enlazada
│  └─ agenda.js       Lógica de la agenda y pago simulado
├─ css/
│  ├─ base.css        Variables de marca, reset, tipografía, botones, formularios
│  ├─ layout.css      Franja demo, menú, secciones, pie de página
│  ├─ components.css  Tarjetas, encabezados, biblioteca, detalle, posts, acordeón
│  ├─ pages.css       Estilos propios de inicio, coaching, nosotros y agenda
│  ├─ admin.css       Panel de administración
│  └─ responsive.css  Celular y tablet
├─ js/
│  ├─ config.js       Conexión con el backend y redes oficiales
│  ├─ admin.js        Panel de administración
│  ├─ api.js          Trae los datos (API o locales) y escapa el texto externo
│  ├─ data.js         DATOS: guías (G) y builds (B). Acá se agrega contenido
│  ├─ mascots.js      Mascotas SVG (data-m="#color" data-v="0|1|2")
│  ├─ cards.js        Tarjeta compartida de guía/build
│  ├─ library.js      Búsqueda y filtros (guias.html / builds.html)
│  ├─ detail.js       Página de detalle
│  ├─ home.js         Contadores y guía más reciente del inicio
└─ assets/img/        Logo, arte del hero y portadas de guías y builds
```
Cada HTML carga los CSS en el mismo orden (base, layout, components, pages, responsive) y solo los JS que necesita.

## Tareas comunes
- **Agregar una guía o build:** sumá un objeto en `js/data.js` y guardá su imagen en `assets/img/` (referenciada en `IMG`). Aparece sola en la biblioteca, en el detalle y en los contadores del inicio.
- **Cambiar colores:** variables en `:root` de `css/base.css` (`--k` negro, `--v` violeta, `--c` crema, `--g` verde).
- **Cambiar el arte del hero:** reemplazá `assets/img/hero.jpg` (se usa en `css/pages.css`).
- **Franja violeta "Modelo piloto":** borrá la línea `<div class="demo">` de cada HTML cuando ya no haga falta.

## Qué es de ejemplo y qué falta para producción
- **Agenda propia (carpeta `futuro/`): pago simulado.** En producción el backend crea el cobro en Mercado Pago/PayPal, retiene el horario 15 minutos y confirma la reserva cuando recibe el aviso (webhook) de pago aprobado, validando la firma.
- **Conexión de cuentas (Discord, Google, Riot): simulada.** Requiere OAuth en el backend. Riot Sign On exige una clave de producción aprobada por Riot.
- **Horarios ocupados, textos del equipo, builds sin imagen y cantidades:** datos de ejemplo.
- **Descarga en PDF:** demo.
- **Detalle de guías:** usa una sola página con parámetros (`detalle.html?id=`). Para posicionar cada guía en Google conviene generar una página por guía (por ejemplo con un generador estático o desde el backend).
- **Imágenes:** recortes de una captura del Instagram, con menos resolución de la ideal. Reemplazar por los originales. Las imágenes incluyen arte de Riot Games: revisar su política de uso antes de publicar el sitio con fines comerciales.
- **Aviso legal:** el pie incluye que MazterLag no está avalado por Riot Games. Faltan las páginas de Términos, Privacidad y Cancelación/Reembolsos (los enlaces son `#`).
