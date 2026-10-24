# MazterLag — Página web

Sitio de MazterLag: inicio, nosotros, coaching, guías y builds, con panel de administración.

## Estructura
```
web/       Sitio estático (HTML + CSS + JS puro). Ver web/README.md
backend/   API en Node.js 18+ (guías, builds, Instagram, Discord, enlaces). Ver backend/README.md
```

El sitio funciona **con o sin backend** (`web/js/config.js` → `apiBase`).

## Probar en local
Solo el sitio:
```
cd web && python3 -m http.server 8000
```
Sitio + backend juntos:
```
cd backend && cp .env.example .env   # completá ADMIN_TOKEN y poné FRONTEND_DIR=../web
npm start                            # http://localhost:3000
```

> En los README de cada parte, donde dice `mazterlag-web` / `mazterlag-backend`, acá son `web/` y `backend/`.
