# MazterLag · Backend

API para el sitio web de MazterLag. Entrega **las guías y builds** (con alta, edición y borrado desde una administración protegida), **las publicaciones reales del Instagram** @mazter_lag, **los miembros de Discord** y **los enlaces oficiales**.

- Node.js 18 o superior. **Sin dependencias externas**: no hace falta `npm install`.
- Los datos se guardan en archivos JSON dentro de `data/` y las imágenes en `uploads/`.
- 22 pruebas automáticas (`npm test`).

## Arranque rápido
```bash
cp .env.example .env        # y completá ADMIN_TOKEN (generalo con: openssl rand -hex 32)
npm start                   # http://localhost:3000
```
La primera vez carga solo las 6 guías, las 5 builds y 4 publicaciones que ya tenía el sitio.

Para que el mismo servidor también muestre el sitio web, en `.env` poné `FRONTEND_DIR=../mazterlag-web` y abrí http://localhost:3000. El sitio detecta el backend solo (el servidor le entrega su propio `js/config.js`).

Si el sitio y el backend están en **dominios distintos** (por ejemplo `mazterlag.com` y `api.mazterlag.com`): en el sitio, `js/config.js` → `apiBase: 'https://api.mazterlag.com'`, y en el backend, `ALLOWED_ORIGINS=https://mazterlag.com`.

## Cómo se carga el contenido
- **Guías = archivos PDF** que sube el equipo. **Builds = publicaciones de Instagram** que se revisan antes de mostrarse.
- Todo se maneja desde el **panel de administración del sitio** (`admin.html`): entrás con la clave, subís el PDF y la portada, y publicás. No hace falta usar la terminal ni FTP.
- Las guías y builds de ejemplo que trae el sitio al arrancar se borran desde ese mismo panel.

## Endpoints públicos (GET)
| Ruta | Qué devuelve |
|---|---|
| `/api/guias` y `/api/builds` | `{ total, items }`. Filtros: `rol`, `campeon`, `tipo`, `q` (busca sin tildes), `limit` (máx. 200), `offset` |
| `/api/guias/:id` y `/api/builds/:id` | Un elemento |
| `/api/instagram?limit=4` | `{ posts, actualizado, fuente, perfil }`: las últimas publicaciones |
| `/api/discord` | `{ configurado, nombre, miembros, enLinea, invitacion }` (caché de 10 min) |
| `/api/enlaces` | Discord, Instagram, YouTube, TikTok y Turnito |
| `/api/health` | `{ ok, version }` |

Cada guía o build: `id, titulo, descripcion, rol (Top|Jungla|Mid|ADC|Support|General), campeon, tipo, imagen (URL), contenido (texto), publicado, fecha, actualizado`. Las builds suman `items` (lista) y `runas`.
Cada publicación de Instagram: `id, titulo, descripcion, imagen, enlace, fecha, tipo, fuente`.

## Administración (requiere `Authorization: Bearer <ADMIN_TOKEN>`)
| Ruta | Para qué |
|---|---|
| `POST /api/admin/guias` (`?avisar=1`) | Crear. Con `avisar=1` avisa en Discord (si hay webhook) |
| `PUT` / `PATCH` / `DELETE /api/admin/guias/:id` | Reemplazar, editar solo algunos campos, borrar |
| `POST/PUT/PATCH/DELETE /api/admin/builds…` | Lo mismo para builds |
| `GET /api/guias?borradores=1` | Incluye las no publicadas |
| `POST /api/admin/imagenes?carpeta=guias&nombre=irelia` | Subir una imagen (cuerpo binario PNG, JPG o WEBP, máx. 5 MB). Devuelve la ruta para usar en `imagen` |
| `POST /api/admin/pdfs?nombre=guia-irelia` | Subir un PDF (cuerpo binario `application/pdf`, máx. 25 MB; se verifica que sea un PDF de verdad). Devuelve la ruta para el campo `pdf` de la guía |
| `POST /api/admin/instagram/sync` | Sincronizar Instagram ahora |
| `GET /api/admin/instagram/posts` | Todas las publicaciones, también las ocultas |
| `PATCH /api/admin/instagram/posts/:id` | `{ "oculto": true }` oculta o muestra una publicación en el sitio |
| `POST /api/admin/instagram/posts/:id/build` | Convierte una publicación en build: `{ campeon, rol, tipo, publicado }` |
| `POST /api/admin/instagram/posts` / `DELETE …/:id` | Cargar o quitar una publicación a mano |
| `GET /api/admin/estado` | Estado de Instagram, Discord y cantidades |

Ejemplos:
```bash
T="tu-ADMIN_TOKEN"; API=http://localhost:3000

# 1) Subir la imagen y 2) crear la guía avisando en Discord
curl -s -X POST "$API/api/admin/imagenes?carpeta=guias&nombre=kaisa" -H "Authorization: Bearer $T" -H "Content-Type: image/png" --data-binary @kaisa.png
curl -s -X POST "$API/api/admin/guias?avisar=1" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -d '{
  "id":"como-jugar-ahri","titulo":"Cómo jugar Ahri","rol":"Mid","tipo":"Campeón","campeon":"Ahri",
  "descripcion":"Lo esencial para jugar Ahri","imagen":"/uploads/guias/kaisa-1a2b3c4d.png",
  "contenido":"Primer párrafo.\n\nSegundo párrafo."}'

# Ocultar una guía sin borrarla
curl -s -X PATCH "$API/api/admin/guias/como-jugar-ahri" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -d '{"publicado":false}'
```

## Instagram (publicaciones reales)
Usa la **API de Instagram con inicio de sesión de Instagram** (Meta). Requisitos: la cuenta @mazter_lag debe ser **profesional** (Empresa o Creador). Pasos:
1. En https://developers.facebook.com crear una app (tipo «Empresa») y agregar el producto **Instagram**.
2. En *Instagram → Configuración de la API con inicio de sesión de Instagram*, agregar la cuenta @mazter_lag y **generar el token** (dura 60 días).
3. Pegarlo en `IG_ACCESS_TOKEN` y reiniciar.

Después es automático:
- Cada `IG_SYNC_MINUTES` (30 por defecto) trae las últimas `IG_MAX_POSTS` publicaciones, **descarga las imágenes** a `uploads/instagram` (las URLs de Instagram vencen) y las sirve desde el propio sitio.
- **Renueva el token solo** a los 30 días y guarda el nuevo en `data/ig-token.json`. Si el servidor estuvo apagado más de 60 días, hay que generar un token nuevo.
- Si Instagram falla, **sigue mostrando lo último guardado** y registra el error en `/api/admin/estado`.
- **Qué publicaciones son builds:** la API de Instagram no informa cuáles están fijadas ni de qué tratan, así que no se puede adivinar. Se resuelve así: las publicaciones cuyo texto lleve **`#build`** (cambiable con `IG_BUILD_TAG`) entran a Builds **como borrador**; vos las revisás en el panel, completás campeón y rol, y las publicás. Cualquier otra publicación se puede convertir en build a mano («Usar como build»), y las que no querés mostrar se **ocultan** (siguen ocultas aunque se sincronice de nuevo). Lo que ya revisaste no se pisa.
- Las 4 publicaciones iniciales son «semilla» y se reemplazan con la primera sincronización exitosa.
- Sin token se pueden cargar publicaciones a mano (`POST /api/admin/instagram/posts`).

> Meta cambia requisitos y pantallas con frecuencia: ante dudas, seguir su guía oficial de «Instagram API with Instagram Login».

## Discord
- `DISCORD_INVITE_CODE=XebU8vQu2F`: con eso `/api/discord` informa miembros y conectados (dato público de la invitación, sin bot).
- `DISCORD_WEBHOOK_URL`: webhook del canal de avisos (Ajustes del canal → Integraciones → Webhooks). Es secreto: va solo en `.env`.
- Un bot (mensajes del servidor, roles, login con Discord) **no está incluido**; es un trabajo aparte.

## Seguridad incluida
Rutas de administración con clave de **mínimo 24 caracteres** (si es más corta, la administración queda desactivada), comparada en tiempo constante y con límite de 30 pedidos/min · límite general por IP (`RATE_LIMIT_PER_MIN`) · CORS con lista de orígenes · validación estricta de cada campo · tope de tamaño de cuerpo (1 MB JSON, 5 MB imágenes) · las imágenes se verifican por su contenido real, no por lo que declara el cliente · los PDF e imágenes se verifican por su contenido real · sin salida de las carpetas de archivos (probado contra `..` y `%2e%2e`) · escritura de datos atómica y en fila (probado con 12 escrituras simultáneas) · encabezados de seguridad y CSP para el sitio · el token de Instagram nunca sale por la API · errores internos sin detalles hacia afuera.
El sitio, por su parte, **escapa todo texto que llega de la API** antes de mostrarlo (probado con un título con HTML malicioso).

## Despliegue
Necesita un servidor Node con **disco persistente** (para `data/` y `uploads/`). Los planes gratuitos con disco efímero pierden los datos en cada reinicio.
- **Render / Railway / Fly.io:** servicio Node, comando `npm start`, variables de `.env.example` en el panel, disco montado en `/data` y `/uploads` (`DATA_DIR=/data`, `UPLOADS_DIR=/uploads`), `TRUST_PROXY=1`, `PUBLIC_URL` con la URL pública.
- **Docker:** `docker build -t mazterlag-backend .` y `docker run -p 3000:3000 -v mzl-data:/data -v mzl-up:/uploads --env-file .env mazterlag-backend`.
- Usar siempre HTTPS (lo da el proveedor o un proxy como Cloudflare).
- Hacer copia de seguridad de `data/` y `uploads/`.

## Qué está probado y qué no
- **Probado:** todas las rutas, validaciones, permisos, subida de imágenes, escrituras simultáneas, límites, CORS, protección de rutas de archivos, sincronización y renovación de token de Instagram y consultas a Discord **contra servidores simulados que imitan sus APIs**, y el sitio completo funcionando contra este backend.
- **No probado contra Instagram ni Discord reales:** no hay acceso a internet en el entorno donde se armó. La primera sincronización con su token real hay que verificarla (`POST /api/admin/instagram/sync` y mirar `/api/admin/estado`).

## Crecer
El almacenamiento es una capa chica (`src/store.js` y `src/collections.js`). Si algún día hacen falta cuentas de usuario, reservas propias o miles de elementos, se reemplaza por una base de datos (Postgres/SQLite) sin cambiar las rutas ni el sitio.

## Estructura
```
src/index.js        arranque          src/server.js     rutas, CORS, límites, archivos
src/config.js       variables         src/validate.js   validación de campos
src/collections.js  guías y builds    src/store.js      archivos JSON atómicos
src/services/       instagram.js, discord.js            src/seed.js  datos iniciales
test/               19 pruebas        seed/             contenido inicial e imágenes
```
