const fs = require('fs');
const path = require('path');

/** Carga un archivo .env simple (KEY=valor). No pisa variables que ya existan en el entorno. */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (/^".*"$|^'.*'$/.test(v)) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

function loadConfig(env = process.env, root = path.join(__dirname, '..')) {
  const s = (k, d = '') => (env[k] !== undefined ? String(env[k]) : d);
  const n = (k, d) => (env[k] !== undefined && env[k] !== '' && !Number.isNaN(Number(env[k])) ? Number(env[k]) : d);
  const port = n('PORT', 3000);
  const trim = u => u.replace(/\/+$/, '');
  return {
    port,
    host: s('HOST', '0.0.0.0'),
    log: s('LOG', '1') !== '0',
    publicUrl: trim(s('PUBLIC_URL', `http://localhost:${port}`)),
    siteUrl: trim(s('SITE_URL', 'http://localhost:8000')),
    allowedOrigins: s('ALLOWED_ORIGINS', 'http://localhost:8000,http://127.0.0.1:8000,http://localhost:3000')
      .split(',').map(x => x.trim()).filter(Boolean),
    adminToken: s('ADMIN_TOKEN'),
    dataDir: path.resolve(root, s('DATA_DIR', 'data')),
    uploadsDir: path.resolve(root, s('UPLOADS_DIR', 'uploads')),
    frontendDir: s('FRONTEND_DIR') ? path.resolve(root, s('FRONTEND_DIR')) : '',
    trustProxy: s('TRUST_PROXY') === '1',
    rateLimitPerMin: n('RATE_LIMIT_PER_MIN', 120),
    maxJsonBytes: 1024 * 1024,
    maxImageBytes: 5 * 1024 * 1024,
    maxPdfBytes: 25 * 1024 * 1024,
    links: {
      discord: s('LINK_DISCORD', 'https://discord.gg/XebU8vQu2F'),
      instagram: s('LINK_INSTAGRAM', 'https://www.instagram.com/mazter_lag'),
      youtube: s('LINK_YOUTUBE', 'https://www.youtube.com/@mazter_lag'),
      tiktok: s('LINK_TIKTOK', 'https://www.tiktok.com/@mazter_lag')
    },
    ig: {
      token: s('IG_ACCESS_TOKEN'),
      base: trim(s('IG_API_BASE', 'https://graph.instagram.com')),
      syncMinutes: n('IG_SYNC_MINUTES', 30),
      maxPosts: Math.min(n('IG_MAX_POSTS', 12), 50),
      buildTag: s('IG_BUILD_TAG', '#build'),
      profileUrl: s('IG_PROFILE_URL', 'https://www.instagram.com/mazter_lag')
    },
    discord: {
      invite: s('DISCORD_INVITE_CODE'),
      base: trim(s('DISCORD_API_BASE', 'https://discord.com/api/v10')),
      webhook: s('DISCORD_WEBHOOK_URL'),
      cacheMinutes: n('DISCORD_CACHE_MINUTES', 10)
    }
  };
}

module.exports = { loadConfig, loadEnvFile };
