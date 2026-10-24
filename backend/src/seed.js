const fs = require('fs');
const path = require('path');

const SEED_DIR = path.join(__dirname, '..', 'seed');

/**
 * Primera ejecución: carga las guías, builds y publicaciones que ya tenía el sitio, para que el
 * backend arranque con contenido. Solo corre si todavía no existen los archivos de datos.
 * Las publicaciones de Instagram semilla se descartan solas cuando se sincroniza Instagram.
 */
function seedIfNeeded(config) {
  const seed = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'seed.json'), 'utf8'));
  fs.mkdirSync(config.dataDir, { recursive: true });
  const now = Date.now();
  const stamp = i => new Date(now - i * 86_400_000).toISOString();

  for (const kind of ['guias', 'builds']) {
    const file = path.join(config.dataDir, `${kind}.json`);
    if (fs.existsSync(file)) continue;
    const items = seed[kind].map((x, i) => ({ ...x, fecha: stamp(i), actualizado: stamp(i) }));
    fs.writeFileSync(file, JSON.stringify({ items }, null, 2));
  }
  const igFile = path.join(config.dataDir, 'instagram.json');
  if (!fs.existsSync(igFile)) {
    const manual = seed.instagram.map((p, i) => ({ id: `semilla-${i + 1}`, tipo: 'IMAGE', ...p, fecha: stamp(i), fuente: 'manual', semilla: true }));
    fs.writeFileSync(igFile, JSON.stringify({ api: [], manual, ocultos: [], syncedAt: null, ok: null, error: null }, null, 2));
  }
  // Imágenes de la semilla
  for (const folder of fs.readdirSync(path.join(SEED_DIR, 'img'))) {
    const from = path.join(SEED_DIR, 'img', folder);
    const to = path.join(config.uploadsDir, folder);
    fs.mkdirSync(to, { recursive: true });
    for (const f of fs.readdirSync(from)) {
      const dest = path.join(to, f);
      if (!fs.existsSync(dest)) fs.copyFileSync(path.join(from, f), dest);
    }
  }
}
module.exports = { seedIfNeeded };
