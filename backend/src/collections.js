const path = require('path');
const { JsonFile } = require('./store');
const { validateEntry } = require('./validate');
const { HttpError } = require('./errors');

const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Colección de guías o builds persistida en <dataDir>/<kind>.json */
function createCollection(kind, config) {
  const store = new JsonFile(path.join(config.dataDir, `${kind}.json`), { items: [] });
  const absUrl = p => (!p ? null : p.startsWith('/') ? config.publicUrl + p : p);
  const toApi = x => ({ ...x, imagen: absUrl(x.imagen), ...(x.pdf !== undefined ? { pdf: x.pdf ? absUrl(x.pdf) : '' } : {}) });
  const find = id => store.get().items.find(x => x.id === id);

  function fail(errors) { throw new HttpError(400, 'Datos inválidos', errors); }

  return {
    store,
    toApi,
    list({ rol, campeon, tipo, q, limit = 100, offset = 0, borradores = false } = {}) {
      const nq = norm(q);
      let rows = store.get().items.filter(x =>
        (borradores || x.publicado) &&
        (!rol || norm(x.rol) === norm(rol)) &&
        (!campeon || norm(x.campeon) === norm(campeon)) &&
        (!tipo || norm(x.tipo) === norm(tipo)) &&
        (!nq || norm(`${x.titulo} ${x.campeon} ${x.descripcion}`).includes(nq)));
      rows.sort((a, b) => b.fecha.localeCompare(a.fecha));
      const total = rows.length;
      limit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200);
      offset = Math.max(parseInt(offset, 10) || 0, 0);
      return { total, items: rows.slice(offset, offset + limit).map(toApi) };
    },
    get(id, { borradores = false } = {}) {
      const x = find(id);
      if (!x || (!x.publicado && !borradores)) throw new HttpError(404, 'No encontrado');
      return toApi(x);
    },
    async create(input, extra = {}) {
      const { value, errors } = validateEntry(kind, input);
      if (Object.keys(errors).length) fail(errors);
      const now = new Date().toISOString();
      return store.update(d => {
        if (d.items.some(x => x.id === value.id)) throw new HttpError(409, `Ya existe un elemento con id "${value.id}"`);
        const item = { ...value, ...extra, fecha: now, actualizado: now };
        d.items.push(item);
        return d;
      }).then(() => toApi(find(value.id)));
    },
    /** replace=true exige todos los campos; replace=false (PATCH) actualiza solo los enviados. */
    async update(id, input, { replace }) {
      const { value, errors } = validateEntry(kind, { ...input, id }, { partial: !replace });
      if (Object.keys(errors).length) fail(errors);
      return store.update(d => {
        const i = d.items.findIndex(x => x.id === id);
        if (i < 0) throw new HttpError(404, 'No encontrado');
        const prev = d.items[i];
        d.items[i] = { ...(replace ? { fuente: prev.fuente, igId: prev.igId } : prev), ...value, id, fecha: prev.fecha, actualizado: new Date().toISOString() };
        if (d.items[i].fuente === undefined) { delete d.items[i].fuente; delete d.items[i].igId; }
        return d;
      }).then(() => toApi(find(id)));
    },
    async remove(id) {
      await store.update(d => {
        const n = d.items.length;
        d.items = d.items.filter(x => x.id !== id);
        if (d.items.length === n) throw new HttpError(404, 'No encontrado');
        return d;
      });
    }
  };
}

module.exports = { createCollection, norm };
