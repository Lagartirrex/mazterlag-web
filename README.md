# MazterLag — Página web

Sitio web de MazterLag: inicio / quiénes somos, coaching y Build Cards.

## Estructura
```
index.html        Página principal
assets/css/       Estilos
assets/js/        Scripts
assets/img/       Imágenes y logos
modelo/           Modelo/diseño de referencia que pasó el usuario
```

## Cómo verla en local
```
python3 -m http.server 8000
```
y abrir http://localhost:8000

## Pendiente
- Subir el modelo de la página a `modelo/` y armar la primera versión a partir de él.
- Enlazar el generador de Build Cards (repo `generador-builds`, corre en PHP: no va en GitHub Pages).
