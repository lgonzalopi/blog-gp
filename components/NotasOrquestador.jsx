'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, Loader2, ArrowLeft, Sparkles, SpellCheck, Undo2, AlertCircle, Copy, Download, Upload, Mic, MicOff, Pencil } from 'lucide-react';
import { TITULO_SITIO, TEMAS_SITIO, C, alfa, RichText, Keywords, resumen, fecha, fechaInput, lectura, btn, contenedor, estiloPagina, ESTILOS_BASE, Footer } from './notas-ui';
import { useAutor } from './AutorContext';

/* ── formato de respaldo: texto plano, legible y reimportable ── */
const SEP = '\n\n=====NOTA=====\n';
const PREFIJO_KW = 'keywords: ';
const serializar = (notas) =>
  notas
    .map((n) => `${n.ts}\n${n.titulo}\n${PREFIJO_KW}${(n.keywords || []).join(', ')}\n---\n${n.text}`)
    .join(SEP);
const deserializar = (txt) =>
  txt.split(/\n*=====NOTA=====\n*/).map((b) => {
    const l = b.split('\n');
    const ts = l[0] && l[0].trim();
    const titulo = l[1] || 'Sin título';
    // Los respaldos viejos no tienen la línea de keywords: se omite y ya.
    const lineaKw = (l[2] || '').startsWith(PREFIJO_KW) ? l[2].slice(PREFIJO_KW.length) : '';
    const i = l.indexOf('---');
    const text = i > -1 ? l.slice(i + 1).join('\n').trim() : '';
    if (!text) return null;
    return {
      id: Math.random().toString(36).slice(2, 9),
      ts: !isNaN(Date.parse(ts)) ? ts : new Date().toISOString(),
      titulo: titulo.trim(),
      keywords: lineaKw.split(',').map((k) => k.trim()).filter(Boolean),
      text,
    };
  }).filter(Boolean);

const NOTAS_EJEMPLO = [
  {
    id: 'ejemplo-estoicismo-control',
    titulo: 'La dicotomía de control, aplicada a un roadmap',
    ts: '2026-07-28T09:30:00.000Z',
    text: `Epicteto decía que unas cosas dependen de nosotros y otras no, y que la fuente de casi todo malestar es tratar como propio lo que no lo es. Lo vengo aplicando, sin querer, a cómo manejo el trabajo.

Un roadmap de producto está lleno de cosas que se sienten controlables pero no lo son: la fecha exacta en que el equipo de diseño entrega, si un competidor lanza algo parecido antes, si el mercado sigue interesado en el problema que resolvés. Pelear contra eso agota.

**Lo que sí depende de mí**: la calidad de la decisión que tomo con la información que tengo hoy, cómo comunico un cambio de prioridad, si aprendo algo de lo que salió mal. Nada de eso garantiza el resultado — pero es lo único sobre lo que tengo control real.

No es resignación, es criterio de dónde poner la energía:
- Ansiedad por lo incontrolable no cambia el resultado, solo gasta foco
- Cuidado extremo en lo controlable sí cambia el resultado
- La frontera entre ambas cosas hay que revisarla seguido, porque se mueve

Ejercicio pendiente: la próxima vez que sienta frustración por algo del roadmap, preguntarme primero de qué lado de la línea está.`,
  },
  {
    id: 'ejemplo-growth-loops',
    titulo: 'Growth loops vs. embudos: dejar de perseguir usuarios',
    ts: '2026-07-24T14:00:00.000Z',
    text: `Durante años pensé el crecimiento como un embudo: metés gente arriba, algunas se convierten abajo, y cuando se estanca, metés más gente arriba. El problema es que un embudo se vacía solo. No genera su propio combustible.

Un growth loop es distinto porque **el output de un ciclo es el input del siguiente**. No hay principio ni fin, hay una rueda que gira sola si está bien diseñada.

Los tres tipos que más se repiten en la práctica:
- Loops virales: cada usuario trae más usuarios (referidos, contenido compartible)
- Loops de contenido: el uso genera contenido que atrae más uso (reseñas, casos, SEO)
- Loops de datos: más uso genera mejores datos, que mejoran el producto, que atrae más uso

Lo que más me costó entender es que **un loop mediocre que se auto-alimenta le gana a un embudo perfecto que necesita presupuesto constante**. No es una métrica más, es una pregunta de diseño: ¿qué hace esta persona después de convertir que trae a la siguiente?

Todavía estoy afinando cómo medir la tasa de un loop sin caer en vanity metrics — eso queda para otra nota.`,
  },
];

export default function NotasOrquestador() {
  const [notas, setNotas] = useState(NOTAS_EJEMPLO);
  const [loaded, setLoaded] = useState(false);
  const [hayStorage, setHayStorage] = useState(null); // null=probando, true/false
  const [pagina, setPagina] = useState(0);

  // La sesión vive en el contexto (lo comparte con el encabezado) para que
  // no se pierda al abrir una nota y volver.
  const { esAutor } = useAutor();

  const [cargando, setCargando] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [keywords, setKeywords] = useState('');
  const [fechaPub, setFechaPub] = useState('');
  const [editandoId, setEditandoId] = useState(null); // null = nota nueva
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(null); // id a confirmar
  const [previo, setPrevio] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [notice, setNotice] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [panelRespaldo, setPanelRespaldo] = useState(null); // 'exportar' | 'importar' | null
  const [importText, setImportText] = useState('');

  const [vozDisponible, setVozDisponible] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const reconocimientoRef = useRef(null);

  const cuerpoRef = useRef(null);

  /* ── grabación por voz (Web Speech API) ── */
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVozDisponible(!!SR);
    // En efecto y no en useState para no romper la hidratación: el servidor
    // no conoce la fecha local del navegador.
    setFechaPub(fechaInput());
  }, []);

  const toggleGrabacion = () => {
    if (grabando) {
      reconocimientoRef.current && reconocimientoRef.current.stop();
      return;
    }
    // El navegador solo da acceso al micrófono en https (o en localhost). Al
    // probar desde el teléfono por IP el error real es este, no un permiso mal
    // dado — sin este aviso el mensaje de abajo confunde.
    if (!window.isSecureContext) {
      setNotice({
        type: 'warn',
        text: 'El dictado por voz necesita una conexión segura (https). Funciona en esta computadora y funcionará en el sitio publicado, pero no al abrirlo desde el teléfono por dirección IP.',
      });
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const r = new SR();
    r.lang = 'es-419';
    r.continuous = true;
    r.interimResults = false;

    r.onresult = (e) => {
      let textoNuevo = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) textoNuevo += e.results[i][0].transcript;
      }
      if (textoNuevo.trim()) {
        setCuerpo((prev) => (prev.trim() ? `${prev.trim()} ${textoNuevo.trim()}` : textoNuevo.trim()));
      }
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setNotice({ type: 'error', text: 'No se pudo acceder al micrófono. Revisa los permisos del navegador.' });
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setNotice({ type: 'error', text: 'La grabación se interrumpió.', detalle: e.error });
      }
    };
    r.onend = () => setGrabando(false);

    reconocimientoRef.current = r;
    r.start();
    setGrabando(true);
  };

  useEffect(() => () => { reconocimientoRef.current && reconocimientoRef.current.stop(); }, []);

  /* ── carga real de notas desde Supabase (vía nuestras rutas API) ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/notes');
        if (!res.ok) throw new Error('no disponible');
        const data = await res.json();
        setNotas(data.notas);
        setHayStorage(true);
      } catch (e) {
        setHayStorage(false);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    const el = cuerpoRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  }, [cuerpo, esAutor, vistaPrevia]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Una confirmación abierta no debe sobrevivir al cambio de página: la
    // tarjeta que estaba confirmando ya no está a la vista.
    setConfirmandoBorrar(null);
  }, [pagina]);

  // El input date da 'YYYY-MM-DD'. Se le agrega la hora actual para que dos
  // notas del mismo día conserven el orden en que se publicaron.
  const tsElegido = () => {
    if (!fechaPub) return undefined;
    const [a, m, d] = fechaPub.split('-').map(Number);
    const ahora = new Date();
    return new Date(a, m - 1, d, ahora.getHours(), ahora.getMinutes(), ahora.getSeconds()).toISOString();
  };

  const limpiarEditor = () => {
    setTitulo(''); setCuerpo(''); setKeywords(''); setFechaPub(fechaInput());
    setPrevio(null); setVistaPrevia(false); setEditandoId(null);
  };

  // Carga una nota publicada en el editor. El id guardado en editandoId es
  // lo que hace que "Publicar" pase a ser "Guardar cambios".
  const editarNota = (n) => {
    setEditandoId(n.id);
    setTitulo(n.titulo === 'Sin título' ? '' : n.titulo);
    setCuerpo(n.text);
    setKeywords((n.keywords || []).join(', '));
    setFechaPub(fechaInput(new Date(n.ts)));
    setPrevio(null); setVistaPrevia(false); setNotice(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => { limpiarEditor(); setNotice(null); };

  const guardarCambios = async () => {
    const t = cuerpo.trim();
    if (!t) return;
    const listaKeywords = keywords.split(',').map((k) => k.trim()).filter(Boolean);
    const cuerpoActualizado = {
      titulo: titulo.trim() || 'Sin título',
      text: t,
      keywords: listaKeywords,
      ts: tsElegido(),
    };

    if (hayStorage) {
      try {
        const res = await fetch(`/api/notes/${editandoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cuerpoActualizado),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'no se pudo guardar');
        const { nota } = await res.json();
        setNotas((prev) => prev.map((n) => (n.id === nota.id ? nota : n))
          .sort((a, b) => new Date(b.ts) - new Date(a.ts)));
      } catch (e) {
        setNotice({ type: 'error', text: 'No se pudieron guardar los cambios. Tu texto sigue acá.', detalle: (e && e.message) || String(e) });
        return;
      }
    } else {
      setNotas((prev) => prev.map((n) => (n.id === editandoId
        ? { ...n, titulo: cuerpoActualizado.titulo, text: t, keywords: listaKeywords, ts: cuerpoActualizado.ts || n.ts }
        : n)).sort((a, b) => new Date(b.ts) - new Date(a.ts)));
    }
    limpiarEditor();
    setNotice({ type: 'ok', text: 'Cambios guardados.' });
  };

  const publicar = async () => {
    if (editandoId) return guardarCambios();
    const t = cuerpo.trim();
    if (!t) return;
    const listaKeywords = keywords.split(',').map((k) => k.trim()).filter(Boolean);
    if (hayStorage) {
      try {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titulo: titulo.trim(), text: t, keywords: listaKeywords, ts: tsElegido() }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'no se pudo publicar');
        const { nota } = await res.json();
        setNotas((prev) => [nota, ...prev].sort((a, b) => new Date(b.ts) - new Date(a.ts)));
        setNotice({ type: 'ok', text: 'Publicado.' });
      } catch (e) {
        setNotice({ type: 'error', text: 'No se pudo publicar. Tu texto sigue acá — inténtalo de nuevo.', detalle: (e && e.message) || String(e) });
        return;
      }
    } else {
      const nueva = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        titulo: titulo.trim() || 'Sin título', text: t,
        keywords: listaKeywords, ts: tsElegido() || new Date().toISOString(),
      };
      setNotas((prev) => [nueva, ...prev].sort((a, b) => new Date(b.ts) - new Date(a.ts)));
      setNotice({ type: 'warn', text: 'Publicado solo en esta sesión (Supabase no está conectado todavía). Usa Respaldar antes de cerrar — si no, se pierde.' });
    }
    limpiarEditor();
    setPagina(0);
  };

  const procesar = async (modo) => {
    const t = cuerpo.trim();
    if (!t) return;
    setCargando(modo); setNotice(null); setVistaPrevia(false);
    const antes = { titulo, cuerpo, keywords };
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo, titulo, cuerpo: t }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'la API devolvió un error');
      if (!data.cuerpo || !data.cuerpo.trim()) throw new Error('no se encontró el cuerpo');
      setPrevio(antes);
      if (data.titulo) setTitulo(data.titulo);
      // Solo sugiere: si el autor ya escribió sus keywords, no se pisan.
      if (data.keywords && data.keywords.length && !keywords.trim()) {
        setKeywords(data.keywords.join(', '));
      }
      setCuerpo(data.cuerpo);
      setNotice({ type: 'ok', text: modo === 'refinar' ? 'Refinado. Revísalo antes de publicar.' : 'Ortografía corregida.' });
    } catch (e) {
      setNotice({ type: 'error', text: 'No se pudo procesar — tu texto quedó como estaba.', detalle: (e && e.message) || String(e) });
    } finally { setCargando(null); }
  };

  const deshacer = () => {
    if (!previo) return;
    setTitulo(previo.titulo); setCuerpo(previo.cuerpo); setKeywords(previo.keywords);
    setPrevio(null); setNotice(null);
  };

  const copiarTexto = async () => {
    try {
      await navigator.clipboard.writeText(`${titulo}\n\n${cuerpo}`.trim());
      setCopiado(true); setTimeout(() => setCopiado(false), 2000);
    } catch (e) {
      setNotice({ type: 'warn', text: 'No se pudo copiar automáticamente. Selecciona el texto a mano.' });
    }
  };

  const eliminar = async (id) => {
    setConfirmandoBorrar(null);
    // Si se estaba editando justo esa nota, el editor queda apuntando a algo
    // que ya no existe: se limpia.
    if (editandoId === id) limpiarEditor();
    if (hayStorage) {
      try {
        const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json()).error || 'no se pudo eliminar');
      } catch (e) {
        setNotice({ type: 'error', text: 'No se pudo eliminar la nota.', detalle: (e && e.message) || String(e) });
        return;
      }
    }
    setNotas((prev) => prev.filter((n) => n.id !== id));
  };

  const importar = async () => {
    const nuevas = deserializar(importText);
    if (!nuevas.length) { setNotice({ type: 'error', text: 'No se reconoció ninguna nota en ese texto.' }); return; }

    if (hayStorage) {
      const publicadas = [];
      for (const n of nuevas) {
        try {
          const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo: n.titulo, text: n.text, keywords: n.keywords, ts: n.ts }),
          });
          if (res.ok) publicadas.push((await res.json()).nota);
        } catch (e) { /* sigue con la próxima */ }
      }
      setNotas((prev) => [...publicadas, ...prev].sort((a, b) => new Date(b.ts) - new Date(a.ts)));
      setNotice({ type: 'ok', text: `${publicadas.length} nota${publicadas.length > 1 ? 's' : ''} restaurada${publicadas.length > 1 ? 's' : ''}.` });
    } else {
      setNotas((prev) => [...nuevas, ...prev].sort((a, b) => new Date(b.ts) - new Date(a.ts)));
      setNotice({ type: 'ok', text: `${nuevas.length} nota${nuevas.length > 1 ? 's' : ''} restaurada${nuevas.length > 1 ? 's' : ''}.` });
    }
    setImportText(''); setPanelRespaldo(null); setPagina(0);
  };

  const colorNotice = notice ? (notice.type === 'error' ? C.error : notice.type === 'warn' ? C.warn : C.green) : C.muted;

  const POR_PAGINA = 5;
  const totalPaginas = Math.max(1, Math.ceil(notas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const notasPagina = notas.slice(paginaActual * POR_PAGINA, paginaActual * POR_PAGINA + POR_PAGINA);

  return (
    <div style={estiloPagina}>
      <style>{`
        ${ESTILOS_BASE}
        textarea::placeholder, input::placeholder { color: ${C.muted}; opacity: .8; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin .9s linear infinite; }
        .card { cursor: pointer; }
        .card:hover .card-title { color: ${C.green}; }
        .card-title { transition: color .25s; }
        /* en pantallas angostas el indicador de página pasa a su propia línea */
        @media (max-width: 420px) {
          .paginacion { justify-content: center !important; }
          .paginacion .pag-label { order: -1; width: 100%; text-align: center; }
        }
      `}</style>

      <div style={contenedor}>
            {/* El nombre, el tema y el candado viven ahora en la barra fija
                (components/Encabezado.jsx). Acá queda solo la portada. */}
            <div style={{ marginBottom: 'clamp(32px, 8vw, 44px)' }}>
              <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 'clamp(28px, 8vw, 38px)', lineHeight: 1.12, color: C.title, margin: '0 0 16px' }}>{TITULO_SITIO}</h1>
              <p style={{ fontSize: 'clamp(13px, 3.4vw, 14px)', lineHeight: 1.7, color: C.muted, margin: 0, maxWidth: '58ch' }}>{TEMAS_SITIO}</p>
            </div>

            {esAutor && hayStorage === false && (
              <div style={{ border: `1px solid ${alfa(C.warn, 20)}`, background: alfa(C.warn, 5), borderRadius: '6px', padding: '12px 14px', marginBottom: '28px', display: 'flex', gap: '10px' }}>
                <AlertCircle size={15} style={{ color: C.warn, flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.warn, lineHeight: 1.6 }}>
                  Supabase todavía no está conectado. Las notas viven solo en esta sesión — respáldalas antes de cerrar, o configura las variables de entorno de Supabase para guardar de verdad.
                </div>
              </div>
            )}

            {esAutor && (
              <div className="fade" style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '8px', padding: '20px', marginBottom: '52px' }}>
                {editandoId && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                    flexWrap: 'wrap', marginBottom: '14px', paddingBottom: '12px',
                    borderBottom: `1px solid ${C.line}`,
                  }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.green }}>
                      Editando una nota publicada
                    </span>
                    <button onClick={cancelarEdicion} style={btn('ghost')}>
                      <X size={13} /> Cancelar
                    </button>
                  </div>
                )}
                <input
                  value={titulo} onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título (opcional — se sugiere al procesar)"
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', marginBottom: '12px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: 600, color: C.title }}
                />
                {vistaPrevia ? (
                  <div style={{ minHeight: '80px' }}>
                    {cuerpo.trim() ? <RichText texto={cuerpo} size={16} /> : <span style={{ color: C.muted, fontSize: '15px' }}>Nada que previsualizar.</span>}
                  </div>
                ) : (
                  <textarea
                    ref={cuerpoRef} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)}
                    placeholder="Escribe o dicta con el micrófono de tu teclado…"
                    rows={3} disabled={!!cargando}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '17px', lineHeight: 1.7, color: C.body }}
                  />
                )}
                <div style={{ height: '1px', background: cuerpo.trim() ? C.green : C.line, margin: '4px 0 14px' }} />

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  <label style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10.5px', color: C.muted, marginBottom: '5px' }}>
                      Palabras clave (separadas por coma)
                    </span>
                    <input
                      value={keywords} onChange={(e) => setKeywords(e.target.value)}
                      placeholder="growth, métricas, criterio"
                      style={{
                        width: '100%', background: C.bg, border: `1px solid ${C.line}`, borderRadius: '3px',
                        padding: '9px 10px', color: C.body, fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px', outline: 'none', minHeight: '40px',
                      }}
                    />
                  </label>
                  <label style={{ flex: '0 1 170px', minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10.5px', color: C.muted, marginBottom: '5px' }}>
                      Fecha de publicación
                    </span>
                    <input
                      type="date" value={fechaPub} onChange={(e) => setFechaPub(e.target.value)}
                      style={{
                        width: '100%', background: C.bg, border: `1px solid ${C.line}`, borderRadius: '3px',
                        padding: '9px 10px', color: C.body, fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px', outline: 'none', minHeight: '40px',
                      }}
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.muted }}>
                    {cuerpo.trim() ? `${cuerpo.trim().split(/\s+/).length} palabras` : '\u00A0'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {vozDisponible && !vistaPrevia && (
                      <button
                        onClick={toggleGrabacion} disabled={!!cargando}
                        aria-label={grabando ? 'Detener grabación' : 'Dictar por voz'}
                        style={grabando ? { ...btn('ghost'), color: C.error, border: `1px solid ${alfa(C.error, 33)}` } : btn('ghost')}
                      >
                        {grabando ? <MicOff size={13} /> : <Mic size={13} />}
                        {grabando ? 'Grabando…' : 'Dictar'}
                      </button>
                    )}
                    {cargando ? (
                      <span style={{ ...btn('primary'), opacity: .85 }}>
                        <Loader2 size={13} className="spin" /> {cargando === 'refinar' ? 'Refinando…' : 'Puliendo…'}
                      </span>
                    ) : cuerpo.trim() && (
                      <>
                        <button onClick={copiarTexto} style={btn('ghost')}><Copy size={13} /> {copiado ? 'Copiado' : 'Copiar'}</button>
                        <button onClick={() => setVistaPrevia(!vistaPrevia)} style={btn('ghost')}>{vistaPrevia ? 'Editar' : 'Ver formato'}</button>
                        {previo && <button onClick={deshacer} style={btn('ghost')}><Undo2 size={13} /> Deshacer</button>}
                        <button onClick={() => procesar('pulir')} style={btn('ghost')}><SpellCheck size={13} /> Pulir</button>
                        <button onClick={() => procesar('refinar')} style={btn('ghost')}><Sparkles size={13} /> Refinar</button>
                        <button onClick={publicar} style={btn('primary')}>
                          {editandoId ? 'Guardar cambios' : 'Publicar'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${C.line}`, flexWrap: 'wrap' }}>
                  <button onClick={() => setPanelRespaldo(panelRespaldo === 'exportar' ? null : 'exportar')} style={btn('ghost')}>
                    <Download size={13} /> Respaldar
                  </button>
                  <button onClick={() => setPanelRespaldo(panelRespaldo === 'importar' ? null : 'importar')} style={btn('ghost')}>
                    <Upload size={13} /> Restaurar
                  </button>
                </div>

                {panelRespaldo === 'exportar' && (
                  <div className="fade" style={{ marginTop: '14px' }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10.5px', color: C.muted, marginBottom: '8px' }}>
                      Selecciona todo y guárdalo donde quieras. Con esto puedes restaurar después.
                    </div>
                    <textarea
                      readOnly value={notas.length ? serializar(notas) : '(sin notas todavía)'}
                      onFocus={(e) => e.target.select()}
                      style={{ width: '100%', height: '160px', background: C.bg, border: `1px solid ${C.line}`, borderRadius: '4px', padding: '10px', color: C.body, fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', lineHeight: 1.6, resize: 'vertical' }}
                    />
                  </div>
                )}

                {panelRespaldo === 'importar' && (
                  <div className="fade" style={{ marginTop: '14px' }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10.5px', color: C.muted, marginBottom: '8px' }}>
                      Pega aquí un respaldo anterior y presiona Restaurar.
                    </div>
                    <textarea
                      value={importText} onChange={(e) => setImportText(e.target.value)}
                      placeholder="Pega el respaldo aquí…"
                      style={{ width: '100%', height: '140px', background: C.bg, border: `1px solid ${C.line}`, borderRadius: '4px', padding: '10px', color: C.body, fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', lineHeight: 1.6, resize: 'vertical' }}
                    />
                    {importText.trim() && (
                      <button onClick={importar} style={{ ...btn('primary'), marginTop: '10px' }}>Restaurar</button>
                    )}
                  </div>
                )}

                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10.5px', color: C.muted, marginTop: '14px', lineHeight: 1.6 }}>
                  Pulir → solo ortografía. · Refinar → además ordena, marca negrillas y arma bullets.
                </div>
              </div>
            )}

            {notice && (
              <div style={{ border: `1px solid ${alfa(colorNotice, 20)}`, background: alfa(colorNotice, 5), borderRadius: '6px', padding: '12px 14px', marginBottom: '28px', display: 'flex', gap: '10px' }}>
                <AlertCircle size={15} style={{ color: colorNotice, flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: colorNotice, lineHeight: 1.5 }}>{notice.text}</div>
                  {notice.detalle && (
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10.5px', color: C.muted, marginTop: '6px', wordBreak: 'break-word' }}>
                      motivo: {notice.detalle}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!loaded ? (
              <div style={{ color: C.muted, fontSize: '14px' }}>Cargando…</div>
            ) : notas.length === 0 ? (
              <div style={{ color: C.muted, fontSize: '15px', fontStyle: 'italic', paddingTop: '24px', borderTop: `1px solid ${C.line}` }}>
                Todavía no hay nada publicado aquí.
              </div>
            ) : (
              <div>
                {notasPagina.map((n, i) => {
                  const idxGlobal = paginaActual * POR_PAGINA + i;
                  return (
                    <Link
                      key={n.id} href={`/notas/${n.id}`} className="card fade"
                      style={{ display: 'block', textDecoration: 'none', paddingTop: '28px', paddingBottom: '4px', borderTop: `1px solid ${C.line}`, marginBottom: '26px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.green }}>
                          #{String(notas.length - idxGlobal).padStart(3, '0')}
                        </span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.muted, flex: 1, minWidth: 0, textAlign: 'right' }}>
                          {fecha(n.ts)} · {lectura(n.text)} min
                        </span>
                        {esAutor && (confirmandoBorrar === n.id ? (
                          <span
                            className="fade"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '8px', flexShrink: 0,
                              margin: '-6px -6px -6px 0', padding: '4px 8px', borderRadius: '4px',
                              background: alfa(C.error, 8), border: `1px solid ${alfa(C.error, 30)}`,
                              fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
                            }}
                          >
                            <span style={{ color: C.error }}>¿Borrar?</span>
                            <button onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); eliminar(n.id); }}
                              aria-label={`Sí, borrar: ${n.titulo}`}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px',
                                fontFamily: 'inherit', fontSize: 'inherit', color: C.error, fontWeight: 600,
                                textTransform: 'uppercase', letterSpacing: '.04em',
                              }}>
                              Sí
                            </button>
                            <span style={{ color: alfa(C.muted, 50) }}>·</span>
                            <button onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); setConfirmandoBorrar(null); }}
                              aria-label="Cancelar el borrado"
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px',
                                fontFamily: 'inherit', fontSize: 'inherit', color: C.muted,
                                textTransform: 'uppercase', letterSpacing: '.04em',
                              }}>
                              No
                            </button>
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', gap: '2px', margin: '-8px -8px -8px 0', flexShrink: 0 }}>
                            <button onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); editarNota(n); }} aria-label={`Editar: ${n.titulo}`}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer', color: C.muted, opacity: .65,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: '32px', height: '32px',
                              }}>
                              <Pencil size={13} />
                            </button>
                            <button onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); setConfirmandoBorrar(n.id); }} aria-label={`Eliminar: ${n.titulo}`}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer', color: C.muted, opacity: .5,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: '32px', height: '32px',
                              }}>
                              <X size={13} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <h2 className="card-title" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 'clamp(19px, 5vw, 22px)', lineHeight: 1.25, color: C.title, margin: '0 0 10px' }}>
                        {n.titulo}
                      </h2>
                      <p style={{ fontSize: 'clamp(14px, 3.8vw, 15px)', lineHeight: 1.7, margin: '0 0 12px', color: C.muted }}>{resumen(n.text)}</p>
                      {n.keywords && n.keywords.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <Keywords items={n.keywords} size={10} />
                        </div>
                      )}
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.green }}>Leer nota →</span>
                    </Link>
                  );
                })}

                {totalPaginas > 1 && (
                  <div className="paginacion" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '8px', paddingTop: '20px', borderTop: `1px solid ${C.line}` }}>
                    <button
                      onClick={() => setPagina((p) => Math.max(0, p - 1))} disabled={paginaActual === 0}
                      style={btn('ghost')}
                    >
                      <ArrowLeft size={13} /> Anteriores
                    </button>
                    <span className="pag-label" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.muted }}>
                      Página {paginaActual + 1} de {totalPaginas}
                    </span>
                    <button
                      onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))} disabled={paginaActual >= totalPaginas - 1}
                      style={btn('ghost')}
                    >
                      Siguientes <ArrowLeft size={13} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                  </div>
                )}
              </div>
            )}

            <Footer />
      </div>
    </div>
  );
}
