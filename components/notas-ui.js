/* Los textos del sitio viven en lib/sitio.mjs (ver el porqué ahí) y se
   reexportan acá para no cambiar los imports del resto del sitio. */
export { AUTOR, TITULO_SITIO, TEMAS_SITIO } from '@/lib/sitio.mjs';

/* Los colores apuntan a variables CSS definidas en app/globals.css, una vez
   por tema. Cambiar de tema es cambiar data-tema en <html>: nada acá se
   recalcula ni se vuelve a renderizar. */
export const C = {
  bg: 'var(--bg)', raised: 'var(--raised)', title: 'var(--title)', body: 'var(--body)',
  muted: 'var(--muted)', green: 'var(--green)', greenText: 'var(--green-text)',
  line: 'var(--line)', error: 'var(--error)', warn: 'var(--warn)',
};

/* Transparencias: con variables CSS no se puede concatenar el alfa en hex
   (`${C.warn}33` daría "var(--warn)33", que es inválido). */
export const alfa = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export const FONTS =
  "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap');";

export const renderInline = (texto, k) =>
  texto.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**') && p.length > 4
      ? <strong key={`${k}-${i}`} style={{ fontWeight: 600, color: C.title }}>{p.slice(2, -2)}</strong>
      : <span key={`${k}-${i}`}>{p}</span>
  );

export const RichText = ({ texto, size = 17 }) => {
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

export const limpiar = (t) => (t || '').replace(/\*\*/g, '').replace(/^\s*[-•]\s+/gm, '').replace(/\s+/g, ' ').trim();
export const resumen = (t, max = 175) => {
  const p = limpiar(t);
  return p.length <= max ? p : p.slice(0, max).replace(/\s+\S*$/, '') + '…';
};

export const fecha = (iso) => new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
export const lectura = (t) => Math.max(1, Math.round(limpiar(t).split(/\s+/).length / 200));

/* Fecha en formato YYYY-MM-DD para <input type="date">, en hora local
   (toISOString daría el día anterior para quien está en zona negativa). */
export const fechaInput = (d = new Date()) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const Keywords = ({ items, size = 11 }) => {
  if (!items || !items.length) return null;
  return (
    <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((k) => (
        <li
          key={k}
          style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: `${size}px`, lineHeight: 1,
            color: C.muted, border: `1px solid ${C.line}`, borderRadius: '999px',
            padding: '5px 9px', whiteSpace: 'nowrap',
          }}
        >
          {k}
        </li>
      ))}
    </ul>
  );
};

export const btn = (v) => {
  const b = {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', letterSpacing: '.04em', textTransform: 'uppercase',
    borderRadius: '3px', padding: '9px 14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', gap: '6px', border: 'none', whiteSpace: 'nowrap',
    minHeight: '40px', // área táctil cómoda en móvil
  };
  return v === 'primary' ? { ...b, background: C.green, color: C.greenText } : { ...b, background: 'transparent', color: C.muted, border: `1px solid ${C.line}` };
};

/* ── layout mobile-first: el ancho y el aire crecen con la pantalla ── */
export const contenedor = {
  maxWidth: '680px',
  margin: '0 auto',
  padding: 'clamp(32px, 8vw, 56px) clamp(18px, 5vw, 24px) clamp(64px, 12vw, 96px)',
};

export const estiloPagina = {
  background: C.bg,
  minHeight: '100vh',
  fontFamily: "'IBM Plex Sans', sans-serif",
  color: C.body,
};

export const ESTILOS_BASE = `
  ${FONTS}
  * { box-sizing: border-box; }
  img, svg { max-width: 100%; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
  @keyframes fadeIn { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform:none;} }
  .fade { animation: fadeIn .45s ease; }
  button:focus-visible, textarea:focus-visible, input:focus-visible, a:focus-visible { outline: 2px solid ${C.green}; outline-offset: 3px; }
  button:disabled { cursor: not-allowed; opacity: .4; }
`;

export const Footer = () => (
  <footer
    style={{
      borderTop: `1px solid ${C.line}`, paddingTop: '24px', marginTop: '20px',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', lineHeight: 1.7,
    }}
  >
    <span>
      <span style={{ color: C.muted }}>Developed by </span>
      <span style={{ color: C.green }}>GP AI powered</span>
    </span>
  </footer>
);
