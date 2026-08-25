#!/usr/bin/env node
/* Agente de ideas y calendario de notas.
 *
 * Corre solo, aparte del sitio. Mira de qué ya escribiste (Supabase), busca en
 * la web qué se está discutiendo hoy en tus temas, y propone ideas de notas con
 * ángulo concreto. Deja un archivo en ideas/ y lo imprime en la terminal.
 *
 *   npm run ideas
 *   npm run ideas -- 12
 *   npm run ideas -- --foco="agentes de IA en equipos de growth"
 *
 * Variables de entorno (ya están en .env.local):
 *   ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Opcionales:
 *   AGENTE_MODELO   (por defecto claude-opus-5)
 *   AGENTE_ESFUERZO (low | medium | high | xhigh | max — por defecto high)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { AUTOR, TITULO_SITIO, TEMAS_SITIO } from '../lib/sitio.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODELO = process.env.AGENTE_MODELO || 'claude-opus-5';
const ESFUERZO = process.env.AGENTE_ESFUERZO || 'high';
const MAX_VUELTAS = 40;

/* ─── argumentos ─────────────────────────────────────────────────────────── */

function leerArgumentos(argv) {
  let cantidad = 8;
  let foco = '';
  for (const arg of argv) {
    if (/^\d+$/.test(arg)) cantidad = Math.min(20, Math.max(1, Number(arg)));
    else if (arg.startsWith('--cantidad=')) cantidad = Math.min(20, Math.max(1, Number(arg.slice(11)) || 8));
    else if (arg.startsWith('--foco=')) foco = arg.slice(7).replace(/^["']|["']$/g, '');
  }
  return { cantidad, foco };
}

/* ─── inventario de lo ya escrito ────────────────────────────────────────── */

async function leerNotas() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('⚠  Sin SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: el agente trabaja sin saber qué ya escribiste.');
    return [];
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('notas')
    .select('id, titulo, cuerpo, keywords, creado_en')
    .order('creado_en', { ascending: false });

  if (error) throw new Error(`Supabase: ${error.message}`);
  return data || [];
}

const fecha = (iso) => new Date(iso).toISOString().slice(0, 10);

function inventario(notas) {
  if (!notas.length) return '(todavía no hay notas publicadas)';
  return notas
    .map((n) => {
      const kws = (n.keywords || []).join(', ') || '—';
      const abre = (n.cuerpo || '').replace(/\s+/g, ' ').trim().slice(0, 220);
      return `- [${n.id}] ${fecha(n.creado_en)} — "${n.titulo}"\n  palabras clave: ${kws}\n  arranca: ${abre}…`;
    })
    .join('\n');
}

/* ─── herramientas del agente ────────────────────────────────────────────── */

const LEER_NOTA = {
  name: 'leer_nota',
  description:
    'Devuelve el texto completo de una nota ya publicada, por su id. Úsala cuando necesites saber ' +
    'qué tan a fondo se trató un tema antes de proponer una idea que lo roce, o para citar con precisión ' +
    'algo que el autor ya argumentó.',
  input_schema: {
    type: 'object',
    properties: { id: { type: 'string', description: 'El id de la nota, tal como aparece entre corchetes en el inventario.' } },
    required: ['id'],
  },
};

const ENTREGAR_IDEAS = {
  name: 'entregar_ideas',
  description:
    'Entrega la lista final de ideas de notas. Llamala una sola vez, cuando ya investigaste y decidiste. ' +
    'Todo lo que no pase por acá no le llega al autor.',
  input_schema: {
    type: 'object',
    properties: {
      panorama: {
        type: 'string',
        description: 'Dos o tres frases sobre qué está pasando ahora en sus temas y qué hueco tiene su blog. Prosa, sin viñetas.',
      },
      ideas: {
        type: 'array',
        description: 'Las ideas propuestas, de la más fuerte a la más débil.',
        items: {
          type: 'object',
          properties: {
            titulo: { type: 'string', description: 'Título tentativo, máximo 8 palabras, sin clickbait.' },
            angulo: { type: 'string', description: '2 o 3 frases: qué defiende la nota, no de qué habla. Una tesis, no un tema.' },
            por_que_ahora: { type: 'string', description: 'Qué la hace oportuna esta semana o este mes. Si no hay nada, decirlo.' },
            gancho: { type: 'string', description: 'La primera frase de la nota, escrita como la escribiría él.' },
            palabras_clave: { type: 'array', items: { type: 'string' }, description: 'Entre 3 y 5, en minúsculas, de una o dos palabras.' },
            relacion_con_notas: { type: 'string', description: 'Con qué nota publicada conversa, la extiende o la contradice. "Ninguna" si es terreno nuevo.' },
            esfuerzo: { type: 'string', enum: ['corta', 'media', 'larga'], description: 'Qué tan larga saldría: corta (~500 palabras), media (~1000), larga (más).' },
            fuentes: { type: 'array', items: { type: 'string' }, description: 'URLs consultadas que sostienen el "por qué ahora". Vacío si la idea no salió de una búsqueda.' },
          },
          required: ['titulo', 'angulo', 'por_que_ahora', 'gancho', 'palabras_clave', 'relacion_con_notas', 'esfuerzo'],
        },
      },
    },
    required: ['ideas'],
  },
};

const BUSCAR_WEB = { type: 'web_search_20260209', name: 'web_search', max_uses: 12 };

/* Ejecuta una herramienta del cliente y devuelve lo que ve el modelo. */
function ejecutar(llamada, notas, recibirEntrega) {
  if (llamada.name === 'leer_nota') {
    const nota = notas.find((n) => n.id === llamada.input?.id);
    if (!nota) return `No existe ninguna nota con id ${llamada.input?.id}.`;
    return `Título: ${nota.titulo}\nPublicada: ${fecha(nota.creado_en)}\nPalabras clave: ${(nota.keywords || []).join(', ') || '—'}\n\n${nota.cuerpo}`;
  }
  if (llamada.name === 'entregar_ideas') {
    const ideas = llamada.input?.ideas;
    if (!Array.isArray(ideas) || !ideas.length) return 'No llegó ninguna idea. Volvé a llamar la herramienta con el arreglo completo.';
    recibirEntrega(llamada.input);
    return `Recibidas ${ideas.length} ideas. Terminá tu turno sin repetirlas ni resumirlas.`;
  }
  return `Herramienta desconocida: ${llamada.name}`;
}

/* ─── prompts ────────────────────────────────────────────────────────────── */

const SISTEMA = `Trabajás como editor y estratega de contenido para ${AUTOR}, que escribe el blog "${TITULO_SITIO}".

Sobre qué escribe: ${TEMAS_SITIO}

Quién es él: viene de marketing, growth y analítica, con criterio técnico alto pero no es desarrollador de oficio. Escribe para sacarse ideas de la cabeza, compartir lo que aprende y construir marca personal. Comparte las notas en LinkedIn. Escribe en primera persona, en español rioplatense neutro, con opinión propia. Detesta el tono corporativo, el listicle vacío y el consejo genérico.

TU TRABAJO
Proponerle ideas de notas que valga la pena escribir. Una idea buena acá es una tesis con ángulo, no un tema. "Cómo usar IA en growth" no es una idea; "por qué el equipo de growth que automatiza reportes antes de entender la métrica termina más lento" sí lo es.

CÓMO TRABAJAR
- Empezá leyendo el inventario de lo que ya publicó. Si algo te parece que quedó a medias o pide continuación, usá leer_nota para verlo entero antes de proponer.
- Buscá en la web qué se está discutiendo ahora mismo en sus temas. Hacé varias búsquedas, en frentes distintos, no una sola genérica. Buscá tanto en español como en inglés.
- Cruzá las dos cosas: lo que él ya piensa y lo que está pasando afuera. Las mejores ideas salen de ese cruce, no de la lista de tendencias.
- Cuando tengas las ideas, llamá a entregar_ideas una sola vez.

QUÉ NO HACER
- No propongas variaciones de una nota que ya escribió, salvo que sea explícitamente una segunda parte o una contradicción de lo que dijo antes; en ese caso decilo.
- No propongas ideas que podrían salir de cualquier blog de marketing. Si el ángulo no depende de que lo escriba él, descartalo.
- No inventes datos, cifras ni fuentes. Si afirmás que algo está pasando ahora, tiene que salir de una búsqueda y llevar su URL.
- No escribas las notas. Solo el gancho, que es una frase.

Entre llamadas a herramientas, escribí poco: una línea diciendo qué estás por hacer. El entregable es lo que pasa por entregar_ideas.`;

const usuario = ({ cantidad, foco, notas }) => `Proponeme ${cantidad} ideas de notas.

${foco ? `Foco pedido para esta ronda: ${foco}\n` : ''}
NOTAS YA PUBLICADAS (${notas.length}):
${inventario(notas)}`;

/* ─── salida ─────────────────────────────────────────────────────────────── */

/* Cada elemento del arreglo es un bloque; se unen con un renglón en blanco
   entre medio, que es lo que Markdown necesita para separar párrafos. */
function aMarkdown({ panorama, ideas }, { foco, sello }) {
  const bloques = [`# Ideas de notas — ${sello.slice(0, 10)}`];
  if (foco) bloques.push(`**Foco de la ronda:** ${foco}`);
  if (panorama) bloques.push(panorama);

  ideas.forEach((idea, i) => {
    bloques.push(
      '---',
      `## ${i + 1}. ${idea.titulo}`,
      `**Ángulo.** ${idea.angulo}`,
      `**Por qué ahora.** ${idea.por_que_ahora}`,
      `**Gancho.** ${idea.gancho}`,
      `**Palabras clave:** ${(idea.palabras_clave || []).join(', ')}`,
      `**Conversa con:** ${idea.relacion_con_notas}`,
      `**Largo estimado:** ${idea.esfuerzo}`,
    );
    if ((idea.fuentes || []).length) {
      bloques.push(`**Fuentes:**\n${idea.fuentes.map((f) => `- ${f}`).join('\n')}`);
    }
  });

  return bloques.join('\n\n') + '\n';
}

function aConsola({ panorama, ideas }) {
  if (panorama) console.log(`\n${panorama}\n`);
  ideas.forEach((idea, i) => {
    console.log(`\n${i + 1}. ${idea.titulo}   [${idea.esfuerzo}]`);
    console.log(`   ${idea.angulo}`);
    console.log(`   Ahora: ${idea.por_que_ahora}`);
    console.log(`   Gancho: "${idea.gancho}"`);
    console.log(`   Claves: ${(idea.palabras_clave || []).join(', ')}`);
    console.log(`   Conversa con: ${idea.relacion_con_notas}`);
    (idea.fuentes || []).forEach((f) => console.log(`   · ${f}`));
  });
}

/* ─── main ───────────────────────────────────────────────────────────────── */

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Falta ANTHROPIC_API_KEY. Está en .env.local; corré esto con "npm run ideas".');
    process.exit(1);
  }

  const { cantidad, foco } = leerArgumentos(process.argv.slice(2));
  console.log(`Agente de ideas — modelo ${MODELO}, esfuerzo ${ESFUERZO}`);

  const notas = await leerNotas();
  console.log(`Leí ${notas.length} nota(s) publicada(s). Buscando en la web…\n`);

  let entrega = null;
  const cliente = new Anthropic();
  const uso = { entrada: 0, salida: 0 };
  const mensajes = [{ role: 'user', content: usuario({ cantidad, foco, notas }) }];

  /* El loop lo manejamos a mano en vez de usar el tool runner del SDK por una
     razón concreta: el buscador web con filtrado dinámico ejecuta código en un
     contenedor del servidor, y la API exige que se le devuelva el id de ese
     contenedor en las llamadas siguientes. El runner no lo arrastra y la
     conversación se corta con un 400. */
  let contenedor;

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    const respuesta = await cliente.messages.create({
      model: MODELO,
      max_tokens: 16000,
      output_config: { effort: ESFUERZO },
      system: SISTEMA,
      tools: [LEER_NOTA, ENTREGAR_IDEAS, BUSCAR_WEB],
      messages: mensajes,
      ...(contenedor ? { container: contenedor } : {}),
    });

    if (respuesta.container?.id) contenedor = respuesta.container.id;
    uso.entrada += respuesta.usage?.input_tokens || 0;
    uso.salida += respuesta.usage?.output_tokens || 0;

    for (const bloque of respuesta.content) {
      if (bloque.type === 'text' && bloque.text.trim()) console.log(`· ${bloque.text.trim()}`);
      if (bloque.type === 'server_tool_use' && bloque.input?.query) console.log(`  ⌕ ${bloque.input.query}`);
    }

    mensajes.push({ role: 'assistant', content: respuesta.content });

    if (respuesta.stop_reason === 'refusal') {
      console.error('\nEl modelo declinó la petición. Probá con otro foco.');
      process.exit(1);
    }
    // Las herramientas del servidor pausan el turno al llegar a su límite
    // interno de vueltas. No es un error: se reenvía y el modelo sigue.
    if (respuesta.stop_reason === 'pause_turn') continue;

    const llamadas = respuesta.content.filter((b) => b.type === 'tool_use');
    if (!llamadas.length) break;

    const resultados = llamadas.map((llamada) => {
      try {
        return { type: 'tool_result', tool_use_id: llamada.id, content: ejecutar(llamada, notas, (e) => { entrega = e; }) };
      } catch (e) {
        return { type: 'tool_result', tool_use_id: llamada.id, content: `Error: ${e?.message || e}`, is_error: true };
      }
    });
    mensajes.push({ role: 'user', content: resultados });

    if (entrega) break;
  }

  if (!entrega || !entrega.ideas?.length) {
    console.error('\nEl agente terminó sin entregar ideas. Volvé a correrlo; si se repite, bajá la cantidad pedida.');
    process.exit(1);
  }

  aConsola(entrega);

  const sello = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const destino = path.join(RAIZ, 'ideas', `ideas-${sello}.md`);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, aMarkdown(entrega, { foco, sello }), 'utf8');

  console.log(`\n📝 ${path.relative(RAIZ, destino)}`);
  console.log(`   ${uso.entrada.toLocaleString('es')} tokens de entrada · ${uso.salida.toLocaleString('es')} de salida\n`);
}

main().catch((e) => {
  console.error(`\nSe cayó: ${e?.message || e}`);
  process.exit(1);
});
