'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Menu, X, Lock, Unlock, Briefcase } from 'lucide-react';
import { AUTOR, C, alfa, btn } from './notas-ui';
import BotonTema from './BotonTema';
import { useAutor } from './AutorContext';

const ALTO = 52; // compacto a propósito: es una barra, no una portada

export default function Encabezado() {
  const { esAutor, entrar, salir } = useAutor();

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [pidiendoClave, setPidiendoClave] = useState(false);
  const [clave, setClave] = useState('');
  const [error, setError] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const menuRef = useRef(null);

  // Cerrar el desplegable al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!menuAbierto) return;
    const fuera = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false); };
    const tecla = (e) => { if (e.key === 'Escape') setMenuAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [menuAbierto]);

  const alternarSesion = () => {
    if (esAutor) { salir(); setPidiendoClave(false); return; }
    setPidiendoClave((v) => !v);
    setError(false);
  };

  const enviarClave = async () => {
    if (!clave.trim() || enviando) return;
    setEnviando(true);
    const ok = await entrar(clave);
    setEnviando(false);
    if (ok) { setPidiendoClave(false); setClave(''); setError(false); }
    else setError(true);
  };

  const iconoBtn = {
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '40px', height: '40px', flexShrink: 0,
  };

  return (
    <header
      style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: C.bg,
        borderBottom: `1px solid ${C.line}`,
        // Sin esto el contenido se transparenta al pasar por debajo.
        backdropFilter: 'saturate(180%) blur(8px)',
      }}
    >
      {/* Propios del encabezado: vive en el layout, fuera del CSS que cada
          página inyecta, así que no puede depender de aquél. */}
      <style>{`
        @keyframes menuEntra {
          from { opacity: 0; transform: translateY(-6px) scale(.98); }
          to   { opacity: 1; transform: none; }
        }
        .menu-desplegable { animation: menuEntra .16s ease-out; transform-origin: top right; }
        .menu-item { transition: background .15s, color .15s; }
        .menu-item:hover, .menu-item:focus-visible { background: ${alfa(C.green, 12)}; color: ${C.title}; }
        @media (prefers-reduced-motion: reduce) { .menu-desplegable { animation: none; } }
      `}</style>
      <div
        style={{
          maxWidth: '680px', margin: '0 auto',
          padding: '0 clamp(18px, 5vw, 24px)',
          height: `${ALTO}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px',
            letterSpacing: '.14em', textTransform: 'uppercase', color: C.green,
            textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {AUTOR}
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', marginRight: '-8px', flexShrink: 0 }}>
          <BotonTema />

          <button
            onClick={alternarSesion}
            aria-label={esAutor ? 'Salir del modo autor' : 'Entrar en modo autor'}
            aria-expanded={pidiendoClave}
            style={{ ...iconoBtn, color: esAutor ? C.green : C.muted, opacity: esAutor ? 1 : 0.5 }}
          >
            {esAutor ? <Unlock size={15} /> : <Lock size={15} />}
          </button>

          <div ref={menuRef} style={{ position: 'relative', display: 'inline-flex' }}>
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuAbierto}
              aria-haspopup="true"
              style={{ ...iconoBtn, color: C.muted }}
            >
              {menuAbierto ? <X size={17} /> : <Menu size={17} />}
            </button>

            {menuAbierto && (
              <div
                className="menu-desplegable"
                role="menu"
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  minWidth: '168px',
                  background: C.raised, border: `1px solid ${C.line}`, borderRadius: '8px',
                  boxShadow: `0 12px 32px ${alfa('#000', 40)}`,
                  overflow: 'hidden',
                }}
              >
                <ul style={{ listStyle: 'none', margin: 0, padding: '6px' }}>
                  <li>
                    <button
                      className="menu-item"
                      role="menuitem"
                      onClick={() => setMenuAbierto(false)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                        textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                        padding: '10px 10px', borderRadius: '5px', minHeight: '42px',
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px',
                        letterSpacing: '.04em', textTransform: 'uppercase', color: C.body,
                      }}
                    >
                      <Briefcase size={14} style={{ color: C.green, flexShrink: 0 }} />
                      <span>Portafolio</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </nav>
      </div>

      {pidiendoClave && !esAutor && (
        <div style={{ borderTop: `1px solid ${C.line}`, background: C.raised }}>
          <div
            className="fade"
            style={{
              maxWidth: '680px', margin: '0 auto',
              padding: '12px clamp(18px, 5vw, 24px)',
              display: 'flex', gap: '8px',
            }}
          >
            <input
              type="password" value={clave} autoFocus placeholder="Clave de autor"
              onChange={(e) => { setClave(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === 'Enter' && enviarClave()}
              style={{
                flex: 1, minWidth: 0, background: C.bg,
                border: `1px solid ${error ? C.error : C.line}`, borderRadius: '3px',
                padding: '9px 12px', color: C.title,
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', outline: 'none',
                minHeight: '40px',
              }}
            />
            <button onClick={enviarClave} disabled={enviando} style={btn('primary')}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
