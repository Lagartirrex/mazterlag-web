/* Datos del sitio. Para sumar una guía o una build, agregá un objeto a G o B.
   Las imágenes se referencian por clave (IMG) y viven en assets/img/. */
const IMG = {
  gu: 'assets/img/guia-urgot.jpg',
  b1: 'assets/img/b1.jpg', b2: 'assets/img/b2.jpg'
};

/* Guías. pdf = archivo para descargar; yt = enlace al video de YouTube de la guía (vacío = todavía no hay video). */
const G = [
  { id: 'urgot', t: 'Guía de Urgot: estrategia, matchups y más', c: 'Urgot', r: 'Top', k: 'Campeón', d: 'Parche 26.21. Identidad, combos, runas, objetos, matchups y macro, por el coach Bruno.', img: 'gu', pdf: 'assets/guias/guia-urgot.pdf', yt: '' }
];

const B = [ // Builds (r = rol, c = campeón, k = tipo)
  { id: 'rakan', t: 'Build de Rakan', c: 'Rakan', r: 'Support', k: 'Utilidad', d: 'Runas, orden de habilidades, hechizos e ítems en una sola imagen.', img: 'b1' },
  { id: 'thresh', t: 'Build de Thresh', c: 'Thresh', r: 'Support', k: 'Utilidad', d: 'Runas, orden de habilidades, hechizos e ítems en una sola imagen.', img: 'b2' },
  { id: 'ahri', t: 'Build de Ahri', c: 'Ahri', r: 'Mid', k: 'Daño', it: ['Ítem 1', 'Ítem 2', 'Ítem 3'], ru: 'Electrocutar', d: 'Build estándar para línea central (de ejemplo).' },
  { id: 'jinx', t: 'Build de Jinx', c: 'Jinx', r: 'ADC', k: 'Daño', it: ['Ítem 1', 'Ítem 2', 'Ítem 3'], ru: 'Pies veloces', d: 'Build para escalar en peleas largas (de ejemplo).' },
  { id: 'garen', t: 'Build de Garen', c: 'Garen', r: 'Top', k: 'Tanque', it: ['Ítem 1', 'Ítem 2', 'Ítem 3'], ru: 'Conquistador', d: 'Build resistente para línea superior (de ejemplo).' }
];
