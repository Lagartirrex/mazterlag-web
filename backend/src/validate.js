const ROLES = ['Top', 'Jungla', 'Mid', 'ADC', 'Support', 'General'];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const clean = s => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

const IMAGE_OK = v => v === '' || (/^\/uploads\/[A-Za-z0-9._\/-]+$/.test(v) && !v.includes('..')) || /^https?:\/\/[^\s]+$/.test(v);

const common = {
  id: { type: 'string', min: 3, max: 60, pattern: SLUG, required: true, hint: 'solo minúsculas, números y guiones (ej: como-jugar-irelia)' },
  titulo: { type: 'string', min: 3, max: 120, required: true },
  descripcion: { type: 'string', max: 600, default: '' },
  rol: { type: 'string', enum: ROLES, required: true },
  campeon: { type: 'string', max: 40, default: 'General' },
  tipo: { type: 'string', min: 2, max: 30, required: true },
  imagen: { type: 'image', max: 300, default: '' },
  contenido: { type: 'string', max: 20000, default: '' },
  publicado: { type: 'bool', default: true }
};
const PDF_OK = v => v === '' || /^\/uploads\/pdfs\/[A-Za-z0-9._-]+\.pdf$/.test(v) || /^https:\/\/[^\s]+\.pdf$/i.test(v);
const specs = {
  guias: { ...common, pdf: { type: 'pdf', max: 300, default: '' } },
  builds: {
    ...common,
    items: { type: 'list', max: 12, itemMax: 60, default: [] },
    runas: { type: 'string', max: 200, default: '' }
  }
};

/** Valida y normaliza. Devuelve { value, errors } (errors: { campo: mensaje }). Ignora campos desconocidos. */
function validateEntry(kind, input, { partial = false } = {}) {
  const spec = specs[kind];
  const errors = {};
  const value = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { value, errors: { _: 'Se esperaba un objeto JSON' } };
  for (const [key, rule] of Object.entries(spec)) {
    const present = Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined && input[key] !== null;
    if (!present) {
      if (partial) continue;
      if (rule.required) { errors[key] = 'es obligatorio'; continue; }
      value[key] = structuredClone(rule.default);
      continue;
    }
    const raw = input[key];
    if (rule.type === 'bool') {
      if (typeof raw !== 'boolean') errors[key] = 'debe ser true o false'; else value[key] = raw;
    } else if (rule.type === 'list') {
      if (!Array.isArray(raw) || raw.length > rule.max || raw.some(x => typeof x !== 'string' || clean(x).length === 0 || clean(x).length > rule.itemMax)) {
        errors[key] = `debe ser una lista de hasta ${rule.max} textos de hasta ${rule.itemMax} caracteres`;
      } else value[key] = raw.map(clean);
    } else {
      if (typeof raw !== 'string') { errors[key] = 'debe ser texto'; continue; }
      const v = clean(raw);
      if (rule.type === 'pdf') {
        if (v.length > rule.max || !PDF_OK(v)) errors[key] = 'debe ser vacío, una ruta /uploads/pdfs/... .pdf o una URL https .pdf';
        else value[key] = v;
        continue;
      }
      if (rule.type === 'image') {
        if (v.length > rule.max || !IMAGE_OK(v)) errors[key] = 'debe ser vacío, una ruta /uploads/... o una URL http(s)';
        else value[key] = v;
        continue;
      }
      if (rule.min && v.length < rule.min) errors[key] = `debe tener al menos ${rule.min} caracteres`;
      else if (v.length > rule.max) errors[key] = `debe tener como máximo ${rule.max} caracteres`;
      else if (rule.enum && !rule.enum.includes(v)) errors[key] = `debe ser uno de: ${rule.enum.join(', ')}`;
      else if (rule.pattern && !rule.pattern.test(v)) errors[key] = rule.hint || 'formato inválido';
      else value[key] = v;
    }
  }
  return { value, errors };
}

module.exports = { validateEntry, ROLES, SLUG, IMAGE_OK, clean };
