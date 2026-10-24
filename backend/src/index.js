const path = require('path');
const { loadConfig, loadEnvFile } = require('./config');
const { createApp } = require('./server');

loadEnvFile(path.join(__dirname, '..', '.env'));
const config = loadConfig();
const app = createApp(config);

if (!config.adminToken) console.warn('[aviso] ADMIN_TOKEN no está configurado: las rutas /api/admin/* están desactivadas.');
if (!config.ig.token) console.warn('[aviso] IG_ACCESS_TOKEN no está configurado: se muestran las publicaciones cargadas a mano.');
if (!config.discord.invite) console.warn('[aviso] DISCORD_INVITE_CODE no está configurado: /api/discord responde configurado:false.');

app.start().then(a => {
  console.log(`MazterLag backend escuchando en http://${a.address === '::' ? 'localhost' : a.address}:${a.port}`);
  if (config.frontendDir) console.log(`Sirviendo el sitio web desde ${config.frontendDir}`);
});

const stop = sig => { console.log(`${sig} recibido, cerrando...`); app.close().then(() => process.exit(0)); setTimeout(() => process.exit(1), 5000).unref(); };
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
