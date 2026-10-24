# CLAUDE.md

## Contexto
Página web de MazterLag. `web/` es el sitio estático (sin frameworks ni build, nada embebido);
`backend/` es la API en Node.js sin dependencias (`npm test` corre las pruebas).
Todo el texto en español rioplatense. Respetar el diseño y la estructura existentes antes que inventar.
Nunca subir `backend/.env` (tiene ADMIN_TOKEN e IG_ACCESS_TOKEN).

## Reglas
El hilo principal coordina; el trabajo pesado va a sub-agentes
(`redactor` Haiku, `programador` Sonnet, `arquitecto` Opus solo si hace falta).
No usar `xhigh`, `max` ni ultracode salvo que el usuario lo pida.
