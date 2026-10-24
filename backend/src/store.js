const fs = require('fs');
const path = require('path');

/**
 * Archivo JSON con escritura atómica y serializada.
 * - get(): datos actuales en memoria.
 * - update(fn): fn recibe una copia, devuelve los datos nuevos (o undefined para no guardar).
 *   Las actualizaciones se ejecutan de a una, así que dos pedidos simultáneos no se pisan.
 * Para este volumen (cientos de guías) alcanza de sobra. Si crece, se reemplaza por una base
 * de datos manteniendo la misma interfaz.
 */
class JsonFile {
  constructor(file, fallback) {
    this.file = file;
    this.fallback = fallback;
    this.queue = Promise.resolve();
    this.data = this._load();
  }
  _load() {
    try {
      return JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch (e) {
      if (e.code === 'ENOENT') return structuredClone(this.fallback);
      throw new Error(`No se pudo leer ${this.file}: ${e.message}`);
    }
  }
  get() { return this.data; }
  exists() { return fs.existsSync(this.file); }
  update(fn) {
    const run = async () => {
      const next = await fn(structuredClone(this.data));
      if (next !== undefined) { await this._save(next); this.data = next; }
      return this.data;
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => {});
    return p;
  }
  async _save(data) {
    await fs.promises.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2));
    await fs.promises.rename(tmp, this.file);
  }
}

module.exports = { JsonFile };
