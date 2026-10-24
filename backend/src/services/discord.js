const { fetchJson } = require('../http-utils');

/** Información pública del servidor (vía invitación) y avisos por webhook. */
function createDiscord(config, { fetchImpl = fetch } = {}) {
  const { invite, base, webhook, cacheMinutes } = config.discord;
  let cache = null;
  const validInvite = /^[A-Za-z0-9-]{2,32}$/.test(invite || '');

  return {
    configured: () => validInvite,
    webhookConfigured: () => !!webhook,
    async info() {
      if (!validInvite) return { configurado: false };
      if (cache && Date.now() - cache.at < cacheMinutes * 60_000) return cache.data;
      try {
        const j = await fetchJson(fetchImpl, `${base}/invites/${invite}?with_counts=true`);
        const data = {
          configurado: true,
          nombre: (j.guild && j.guild.name) || null,
          miembros: j.approximate_member_count ?? null,
          enLinea: j.approximate_presence_count ?? null,
          invitacion: `https://discord.gg/${invite}`,
          actualizado: new Date().toISOString()
        };
        cache = { at: Date.now(), data };
        return data;
      } catch (e) {
        if (cache) return { ...cache.data, desactualizado: true };
        throw e;
      }
    },
    /** Envía un mensaje al canal del webhook. Devuelve 'enviado' u 'omitido'; lanza error si falla. */
    async notify(text) {
      if (!webhook) return 'omitido';
      await fetchJson(fetchImpl, webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: String(text).slice(0, 1900), allowed_mentions: { parse: [] } })
      });
      return 'enviado';
    }
  };
}
module.exports = { createDiscord };
