/* Datos del sitio. Para sumar una guía o una build, agregá un objeto a G o B.
   Las imágenes se referencian por clave (IMG) y viven en assets/img/. */
const IMG = {
  g1: 'assets/img/g1.jpg', g2: 'assets/img/g2.jpg', g3: 'assets/img/g3.jpg',
  g4: 'assets/img/g4.jpg', g5: 'assets/img/g5.jpg', g7: 'assets/img/g7.jpg',
  b1: 'assets/img/b1.jpg', b2: 'assets/img/b2.jpg'
};

const G = [ // Guías
  { id: 'abandonar-adc', t: 'Cuándo abandonar a tu ADC', c: 'General', r: 'Support', k: 'Fundamentos', d: 'Temporada 16. Cuándo dejar de proteger a tu ADC y jugar para el resto del equipo.', img: 'g1' },
  { id: 'irelia', t: 'Cómo jugar Irelia y dominar la grieta', c: 'Irelia', r: 'Top', k: 'Campeón', d: 'Temporada 16. Lo esencial para jugar Irelia con criterio.', img: 'g2' },
  { id: 'mordekaiser', t: 'Cómo jugar Mordekaiser', c: 'Mordekaiser', r: 'Top', k: 'Campeón', d: 'Season 16 master en minutos: lo que tenés que saber para dominar la grieta.', img: 'g3' },
  { id: 'kaisa', t: "Cómo jugar Kai'Sa", c: "Kai'Sa", r: 'ADC', k: 'Campeón', d: "Temporada 16. Lo esencial para jugar Kai'Sa y dominar la grieta.", img: 'g5' },
  { id: 'garen-lore', t: '¿Sabías qué…? El secreto de Garen', c: 'Garen', r: 'Top', k: 'Lore', d: 'Un dato de lore sobre Garen, Demacia y su familia.', img: 'g4' },
  { id: 'elise-lore', t: '¿Sabías qué…? El precio de la belleza de Elise', c: 'Elise', r: 'Jungla', k: 'Lore', d: 'Un dato de lore sobre Elise y su pacto con Vilemaw.', img: 'g7' }
];

const B = [ // Builds (r = rol, c = campeón, k = tipo)
  { id: 'rakan', t: 'Build de Rakan', c: 'Rakan', r: 'Support', k: 'Utilidad', d: 'Runas, orden de habilidades, hechizos e ítems en una sola imagen.', img: 'b1' },
  { id: 'thresh', t: 'Build de Thresh', c: 'Thresh', r: 'Support', k: 'Utilidad', d: 'Runas, orden de habilidades, hechizos e ítems en una sola imagen.', img: 'b2' },
  { id: 'ahri', t: 'Build de Ahri', c: 'Ahri', r: 'Mid', k: 'Daño', it: ['Ítem 1', 'Ítem 2', 'Ítem 3'], ru: 'Electrocutar', d: 'Build estándar para línea central (de ejemplo).' },
  { id: 'jinx', t: 'Build de Jinx', c: 'Jinx', r: 'ADC', k: 'Daño', it: ['Ítem 1', 'Ítem 2', 'Ítem 3'], ru: 'Pies veloces', d: 'Build para escalar en peleas largas (de ejemplo).' },
  { id: 'garen', t: 'Build de Garen', c: 'Garen', r: 'Top', k: 'Tanque', it: ['Ítem 1', 'Ítem 2', 'Ítem 3'], ru: 'Conquistador', d: 'Build resistente para línea superior (de ejemplo).' }
];
