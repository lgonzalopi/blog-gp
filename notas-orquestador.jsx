import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Lock, Unlock, ArrowLeft, Sparkles, SpellCheck, Undo2, AlertCircle, Copy, Download, Upload } from 'lucide-react';

/* ─────────────────────────────────────────────
   ARCHIVO DE REFERENCIA — no lo usa el sitio.

   Es el componente original del artefacto de Claude.ai, que se conserva
   solo como registro del diseño de partida. El sitio corre sobre
   components/NotasOrquestador.jsx.

   La clave de autor vivía acá en texto plano. Ya no: se verifica en el
   servidor (app/api/auth) contra la variable de entorno AUTHOR_PASSWORD,
   que nunca llega al navegador ni al repositorio.
   ───────────────────────────────────────────── */
const CLAVE_AUTOR = '';
const AUTOR = 'Gonzalo';
const TITULO_SITIO = 'Notas de un orquestador';
const DESCRIPCION_SITIO =
  'Tecnología, frameworks de trabajo, marketing y growth — y de a ratos estoicismo y crecimiento personal. Lo que voy entendiendo, mientras lo entiendo.';

const K_DATOS = 'notas_v8';

const C = {
  bg: '#0B0C0E', raised: '#131417', title: '#F3F4F0', body: '#C7C9C2',
  muted: '#7C7E76', green: '#3ECE8A', line: '#24261F', error: '#E0796A', warn: '#D9A441',
};

const FONTS =
  "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap');";

const REGLAS_FORMATO = `FORMATO DE RESPUESTA (obligatorio, sin excepciones):

<<<TITULO>>>
el título aquí, en una sola línea
<<<CUERPO>>>
el texto completo aquí, con sus párrafos y saltos de línea normales

No escribas nada antes, entre, ni después de esos marcadores. No uses JSON ni bloques de código.`;

const PROMPT_PULIR = `Eres un corrector de estilo cuidadoso que trabaja para un autor con voz propia y muy definida.

Tu única tarea sobre el cuerpo es corregir ortografía, tildes, puntuación y errores gramaticales evidentes. No cambies el vocabulario, no reformules oraciones, no acortes ni resumas, no agregues ideas nuevas, no cambies el tono ni el orden de las ideas. Si el texto viene de un dictado por voz, arregla la puntuación y separa en párrafos donde corresponda, sin reescribir.

Propón además un título breve (máximo 7 palabras) usando solo palabras y conceptos que ya están en el texto. Sin clickbait.

${REGLAS_FORMATO}`;

const PROMPT_REFINAR = `Eres un editor que trabaja para un autor con voz propia, muy definida y no negociable. Tu trabajo es que su borrador deje de parecer borrador, SIN que deje de sonar a él.

QUÉ SÍ HACER:
- Corregir ortografía, tildes, puntuación y gramática.
- Mejorar el orden semántico: si una idea aparece antes de lo que la sostiene, reordena las oraciones dentro del párrafo. Agrupa en párrafos coherentes.
- Ajustar palabras sueltas cuando una repetición o una muletilla debilita la frase. Cambios quirúrgicos, no reescrituras.
- Eliminar rellenos de dictado ("o sea", "no sé", "digamos", "¿me entiendes?") cuando no aportan.
- Poner en **negrilla** las palabras o frases clave donde el lector debe detenerse. Máximo 2 o 3 por párrafo.
- Cuando el autor enumere cosas separadas por comas o por "y", conviértelo en lista con guiones. Solo si es una enumeración real de 3 o más elementos.

QUÉ NUNCA HACER:
- No cambies su vocabulario característico ni su forma de construir argumentos.
- No agregues ideas, ejemplos, datos ni conclusiones que él no escribió.
- No resumas ni acortes: el texto refinado debe tener aproximadamente el mismo largo.
- No lo vuelvas corporativo, neutro ni genérico. Si dudas, se queda como él lo dijo.
- No uses encabezados, ni numeración, ni cursivas.

En el cuerpo: párrafos separados por línea en blanco, negrillas con **dobles asteriscos**, bullets con "- " al inicio de línea.
Propón además un título breve (máximo 7 palabras) con palabras que ya están en el texto.

${REGLAS_FORMATO}`;

const parseRespuesta = (raw) => {
  const t = raw.replace(/```/g, '').trim();
  const m = t.match(/<<<TITULO>>>\s*\n?([\s\S]*?)\n?\s*<<<CUERPO>>>\s*\n?([\s\S]*)$/);
  return m ? { titulo: m[1].trim(), cuerpo: m[2].trim() } : { titulo: '', cuerpo: t };
};

const renderInline = (texto, k) =>
  texto.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**') && p.length > 4
      ? <strong key={`${k}-${i}`} style={{ fontWeight: 600, color: C.title }}>{p.slice(2, -2)}</strong>
      : <span key={`${k}-${i}`}>{p}</span>
  );

const RichText = ({ texto, size = 17 }) => {
  const bloques = []; let lista = null;
  (texto || '').split('\n').forEach((linea) => {
    if (/^\s*[-•]\s+/.test(linea)) {
      const c = linea.replace(/^\s*[-•]\s+/, '');
      if (!lista) { lista = { tipo: 'lista', items: [] }; bloques.push(lista); }
      lista.items.push(c);
    } else { lista = null; if (linea.trim()) bloques.push({ tipo: 'parrafo', texto: linea }); }
  });
  return (
    <div>
      {bloques.map((b, i) => b.tipo === 'lista' ? (
        <ul key={i} style={{ margin: '0 0 20px', padding: 0, listStyle: 'none' }}>
          {b.items.map((item, j) => (
            <li key={j} style={{ display: 'flex', gap: '12px', marginBottom: '9px', fontSize: `${size - 1}px`, lineHeight: 1.7, color: C.body }}>
              <span style={{ color: C.green, flexShrink: 0 }}>—</span>
              <span>{renderInline(item, `${i}-${j}`)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p key={i} style={{ margin: '0 0 20px', fontSize: `${size}px`, lineHeight: 1.8, color: C.body }}>
          {renderInline(b.texto, i)}
        </p>
      ))}
    </div>
  );
};

const limpiar = (t) => (t || '').replace(/\*\*/g, '').replace(/^\s*[-•]\s+/gm, '').replace(/\s+/g, ' ').trim();
const resumen = (t, max = 175) => {
  const p = limpiar(t);
  return p.length <= max ? p : p.slice(0, max).replace(/\s+\S*$/, '') + '…';
};

/* ── formato de respaldo: texto plano, legible y reimportable ── */
const SEP = '\n\n=====NOTA=====\n';
const serializar = (notas) =>
  notas.map((n) => `${n.ts}\n${n.titulo}\n---\n${n.text}`).join(SEP);
const deserializar = (txt) =>
  txt.split(/\n*=====NOTA=====\n*/).map((b) => {
    const l = b.split('\n');
    const ts = l[0] && l[0].trim();
    const titulo = l[1] || 'Sin título';
    const i = l.indexOf('---');
    const text = i > -1 ? l.slice(i + 1).join('\n').trim() : '';
    if (!text) return null;
    return {
      id: Math.random().toString(36).slice(2, 9),
      ts: !isNaN(Date.parse(ts)) ? ts : new Date().toISOString(),
      titulo: titulo.trim(), text,
    };
  }).filter(Boolean);

export default function NotasOrquestador() {
  const [notas, setNotas] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [hayStorage, setHayStorage] = useState(null); // null=probando, true/false
  const [abierta, setAbierta] = useState(null);

  const [esAutor, setEsAutor] = useState(false);
  const [pidiendoClave, setPidiendoClave] = useState(false);
  const [claveInput, setClaveInput] = useState('');
  const [claveError, setClaveError] = useState(false);

  const [cargando, setCargando] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [previo, setPrevio] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [notice, setNotice] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [panelRespaldo, setPanelRespaldo] = useState(null); // 'exportar' | 'importar' | null
  const [importText, setImportText] = useState('');

  const cuerpoRef = useRef(null);

  /* ── prueba real del almacenamiento al arrancar ── */
  useEffect(() => {
    (async () => {
      let ok = false;
      try {
        const r = await window.storage.set('__ping__', '1', true);
        if (r) ok = true;
      } catch (e) { /* no disponible */ }
      if (!ok) {
        try {
          const r = await window.storage.set('__ping__', '1', false);
          if (r) ok = true;
        } catch (e) { /* tampoco */ }
      }
      setHayStorage(ok);

      if (ok) {
        for (const compartido of [true, false]) {
          try {
            const r = await window.storage.get(K_DATOS, compartido);
            if (r && r.value) { setNotas(JSON.parse(r.value)); break; }
          } catch (e) { /* sigue */ }
        }
      }
      setLoaded(true);
    })();
  }, []);

  const persistir = async (lista) => {
    setNotas(lista);
    if (!hayStorage) return;
    for (const compartido of [true, false]) {
      try {
        const r = await window.storage.set(K_DATOS, JSON.stringify(lista), compartido);
        if (r) return;
      } catch (e) { /* prueba el siguiente */ }
    }
  };

  useEffect(() => {
    const el = cuerpoRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  }, [cuerpo, esAutor, vistaPrevia]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [abierta]);

  useEffect(() => {
    if (!abierta) return;
    const h = (e) => e.key === 'Escape' && setAbierta(null);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [abierta]);

  const publicar = async () => {
    const t = cuerpo.trim();
    if (!t) return;
    const nueva = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      titulo: titulo.trim() || 'Sin título', text: t, ts: new Date().toISOString(),
    };
    await persistir([nueva, ...notas]);
    setTitulo(''); setCuerpo(''); setPrevio(null); setVistaPrevia(false);
    setNotice(hayStorage
      ? { type: 'ok', text: 'Publicado.' }
      : { type: 'warn', text: 'Publicado solo en esta sesión. Usa Respaldar antes de cerrar — si no, se pierde.' });
  };

  const procesar = async (modo) => {
    const t = cuerpo.trim();
    if (!t) return;
    setCargando(modo); setNotice(null); setVistaPrevia(false);
    const antes = { titulo, cuerpo };
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 4000,
          system: modo === 'refinar' ? PROMPT_REFINAR : PROMPT_PULIR,
          messages: [{
            role: 'user',
            content: titulo.trim()
              ? `Título propuesto por el autor (respétalo, solo corrige ortografía si hace falta): ${titulo.trim()}\n\nCuerpo:\n${t}`
              : t,
          }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || 'la API devolvió un error');
      const raw = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      if (!raw.trim()) throw new Error('respuesta vacía');
      const { titulo: nt, cuerpo: nc } = parseRespuesta(raw);
      if (!nc.trim()) throw new Error('no se encontró el cuerpo');
      setPrevio(antes);
      if (nt) setTitulo(nt);
      setCuerpo(nc);
      setNotice({ type: 'ok', text: modo === 'refinar' ? 'Refinado. Revísalo antes de publicar.' : 'Ortografía corregida.' });
    } catch (e) {
      setNotice({ type: 'error', text: 'No se pudo procesar — tu texto quedó como estaba.', detalle: (e && e.message) || String(e) });
    } finally { setCargando(null); }
  };

  const deshacer = () => {
    if (!previo) return;
    setTitulo(previo.titulo); setCuerpo(previo.cuerpo); setPrevio(null); setNotice(null);
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
    if (abierta === id) setAbierta(null);
    await persistir(notas.filter((n) => n.id !== id));
  };

  const importar = () => {
    const nuevas = deserializar(importText);
    if (!nuevas.length) { setNotice({ type: 'error', text: 'No se reconoció ninguna nota en ese texto.' }); return; }
    persistir([...nuevas, ...notas].sort((a, b) => new Date(b.ts) - new Date(a.ts)));
    setImportText(''); setPanelRespaldo(null);
    setNotice({ type: 'ok', text: `${nuevas.length} nota${nuevas.length > 1 ? 's' : ''} restaurada${nuevas.length > 1 ? 's' : ''}.` });
  };

  const intentarClave = () => {
    if (claveInput === CLAVE_AUTOR) { setEsAutor(true); setPidiendoClave(false); setClaveInput(''); setClaveError(false); }
    else setClaveError(true);
  };

  const fecha = (iso) => new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
  const lectura = (t) => Math.max(1, Math.round(limpiar(t).split(/\s+/).length / 200));

  const btn = (v) => {
    const b = {
      fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', letterSpacing: '.04em', textTransform: 'uppercase',
      borderRadius: '3px', padding: '9px 14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none',
    };
    return v === 'primary' ? { ...b, background: C.green, color: '#0B0C0E' } : { ...b, background: 'transparent', color: C.muted, border: `1px solid ${C.line}` };
  };

  const nota = notas.find((n) => n.id === abierta);
  const iNota = notas.findIndex((n) => n.id === abierta);
  const colorNotice = notice ? (notice.type === 'error' ? C.error : notice.type === 'warn' ? C.warn : C.green) : C.muted;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'IBM Plex Sans', sans-serif", color: C.body }}>
      <style>{`
        ${FONTS}
        textarea::placeholder, input::placeholder { color: ${C.muted}; opacity: .8; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform:none;} }
        .spin { animation: spin .9s linear infinite; }
        .fade { animation: fadeIn .45s ease; }
        button:focus-visible, textarea:focus-visible, input:focus-visible, [role="button"]:focus-visible { outline: 2px solid ${C.green}; outline-offset: 3px; }
        button:disabled { cursor: not-allowed; opacity: .4; }
        .card { cursor: pointer; }
        .card:hover .card-title { color: ${C.green}; }
        .card-title { transition: color .25s; }
      `}</style>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '56px 24px 96px' }}>
        {nota ? (
          <div className="fade">
            <button onClick={() => setAbierta(null)} style={{ ...btn('ghost'), marginBottom: '36px' }}>
              <ArrowLeft size={13} /> Volver
            </button>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'baseline', marginBottom: '14px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.green }}>
                #{String(notas.length - iNota).padStart(3, '0')}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.muted }}>
                {fecha(nota.ts)} · {lectura(nota.text)} min de lectura
              </span>
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '32px', lineHeight: 1.2, color: C.title, margin: '0 0 28px' }}>
              {nota.titulo}
            </h1>
            <RichText texto={nota.text} size={17} />
            <div style={{ borderTop: `1px solid ${C.line}`, marginTop: '36px', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.muted }}>{AUTOR}</span>
              <button onClick={() => setAbierta(null)} style={btn('ghost')}><ArrowLeft size={13} /> Todas las notas</button>
            </div>
          </div>
        ) : (
          <>
            <header style={{ marginBottom: '44px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '.15em', textTransform: 'uppercase', color: C.green }}>{AUTOR}</span>
                <button
                  onClick={() => (esAutor ? setEsAutor(false) : setPidiendoClave(!pidiendoClave))}
                  aria-label={esAutor ? 'Salir del modo autor' : 'Entrar en modo autor'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: esAutor ? C.green : C.muted, opacity: esAutor ? 1 : .4, padding: '4px' }}
                >
                  {esAutor ? <Unlock size={14} /> : <Lock size={14} />}
                </button>
              </div>
              <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '38px', lineHeight: 1.12, color: C.title, margin: '0 0 16px' }}>{TITULO_SITIO}</h1>
              <p style={{ fontSize: '16px', lineHeight: 1.65, color: C.muted, margin: 0, maxWidth: '52ch' }}>{DESCRIPCION_SITIO}</p>
            </header>

            {esAutor && hayStorage === false && (
              <div style={{ border: `1px solid ${C.warn}33`, background: `${C.warn}0D`, borderRadius: '6px', padding: '12px 14px', marginBottom: '28px', display: 'flex', gap: '10px' }}>
                <AlertCircle size={15} style={{ color: C.warn, flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.warn, lineHeight: 1.6 }}>
                  Este entorno no permite guardar. Las notas viven solo en esta sesión — respáldalas antes de cerrar. Prueba abrir la página desde una computadora.
                </div>
              </div>
            )}

            {pidiendoClave && !esAutor && (
              <div className="fade" style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
                <input
                  type="password" value={claveInput} autoFocus placeholder="Clave de autor"
                  onChange={(e) => { setClaveInput(e.target.value); setClaveError(false); }}
                  onKeyDown={(e) => e.key === 'Enter' && intentarClave()}
                  style={{ flex: 1, background: C.raised, border: `1px solid ${claveError ? C.error : C.line}`, borderRadius: '3px', padding: '9px 12px', color: C.title, fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', outline: 'none' }}
                />
                <button onClick={intentarClave} style={btn('primary')}>Entrar</button>
              </div>
            )}

            {esAutor && (
              <div className="fade" style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '8px', padding: '20px', marginBottom: '52px' }}>
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.muted }}>
                    {cuerpo.trim() ? `${cuerpo.trim().split(/\s+/).length} palabras` : '\u00A0'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
                        <button onClick={publicar} style={btn('primary')}>Publicar</button>
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
              <div style={{ border: `1px solid ${colorNotice}33`, background: `${colorNotice}0D`, borderRadius: '6px', padding: '12px 14px', marginBottom: '28px', display: 'flex', gap: '10px' }}>
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
                {notas.map((n, i) => (
                  <div
                    key={n.id} className="card fade" role="button" tabIndex={0}
                    onClick={() => setAbierta(n.id)}
                    onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), setAbierta(n.id))}
                    style={{ paddingTop: '28px', paddingBottom: '4px', borderTop: `1px solid ${C.line}`, marginBottom: '26px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '10px' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.green }}>
                        #{String(notas.length - i).padStart(3, '0')}
                      </span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.muted, flex: 1, textAlign: 'right' }}>
                        {fecha(n.ts)} · {lectura(n.text)} min
                      </span>
                      {esAutor && (
                        <button onClick={(ev) => { ev.stopPropagation(); eliminar(n.id); }} aria-label="Eliminar nota"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, opacity: .5, padding: '2px' }}>
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    <h2 className="card-title" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '22px', lineHeight: 1.25, color: C.title, margin: '0 0 10px' }}>
                      {n.titulo}
                    </h2>
                    <p style={{ fontSize: '15px', lineHeight: 1.7, margin: '0 0 10px', color: C.muted }}>{resumen(n.text)}</p>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.green }}>Leer nota →</span>
                  </div>
                ))}
              </div>
            )}

            <footer style={{ borderTop: `1px solid ${C.line}`, paddingTop: '24px', marginTop: '20px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.muted }}>
              Escrito por {AUTOR} · pensado en voz alta
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
