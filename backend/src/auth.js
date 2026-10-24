const crypto = require('crypto');
const { HttpError } = require('./errors');

const digest = s => crypto.createHash('sha256').update(String(s)).digest();

/** Compara en tiempo constante el token Bearer con ADMIN_TOKEN. */
function isAdmin(req, config) {
  if (!config.adminToken || config.adminToken.length < 24) return false;
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  return crypto.timingSafeEqual(digest(m[1]), digest(config.adminToken));
}

function requireAdmin(req, config) {
  if (!config.adminToken) throw new HttpError(503, 'La administración está desactivada: falta configurar ADMIN_TOKEN');
  if (config.adminToken.length < 24) throw new HttpError(503, 'La administración está desactivada: ADMIN_TOKEN debe tener al menos 24 caracteres');
  if (!isAdmin(req, config)) throw new HttpError(401, 'Token de administración inválido o ausente');
}

module.exports = { isAdmin, requireAdmin };
