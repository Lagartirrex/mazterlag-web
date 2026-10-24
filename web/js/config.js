/* Configuración del sitio. Es lo único que hay que tocar para conectar el backend. */
window.MZL_CONFIG = {
  /* null  -> el sitio usa los datos locales de js/data.js (no necesita backend)
     ''    -> el backend está en el mismo dominio que el sitio (el backend sirve el sitio y completa esto solo)
     'https://api.tudominio.com' -> el backend está en otro dominio */
  apiBase: null,

  /* Redes oficiales. Con backend se leen de GET /api/enlaces; los HTML traen estos mismos como respaldo.
     El link de pago de Turnito NO se configura acá a propósito: está fijo en coaching.html. */
  links: {
    discord: 'https://discord.gg/XebU8vQu2F',
    instagram: 'https://www.instagram.com/mazter_lag',
    youtube: 'https://www.youtube.com/@mazter_lag',
    tiktok: 'https://www.tiktok.com/@mazter_lag'
  }
};
