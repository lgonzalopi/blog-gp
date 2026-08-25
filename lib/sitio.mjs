/* Textos del sitio — fuente única.
   Vive acá, y no en components/notas-ui.js, porque ese archivo tiene JSX y
   Node no puede importarlo tal cual. El agente de ideas (agente/ideas.mjs)
   corre en Node puro y necesita estos textos. notas-ui.js los reexporta,
   así que el resto del sitio sigue importándolos de donde siempre. */

export const AUTOR = 'Gonzalo Pérez';
export const TITULO_SITIO = 'Blog del Orquestador';

/* Subtítulo del sitio y, a la vez, el texto que se previsualiza cuando se
   comparte el link de la portada en redes. Un solo lugar para las dos cosas
   para que no se desincronicen. */
export const TEMAS_SITIO =
  'Tecnología, AI, Growth, frameworks, startups, marketing, data analytics, first principles, systems thinking, desarrollo personal, alto rendimiento, autoconocimiento, salud integral y más.';
