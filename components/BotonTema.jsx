'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { C } from './notas-ui';

const COLOR_FONDO = { oscuro: '#0b0c0e', claro: '#fafaf8' };

export default function BotonTema() {
  // Arranca en null: el tema real lo fijó el script inline del layout antes
  // de pintar. Leerlo acá recién en useEffect evita que el HTML del servidor
  // y el del cliente difieran.
  const [tema, setTema] = useState(null);

  useEffect(() => {
    setTema(document.documentElement.dataset.tema === 'claro' ? 'claro' : 'oscuro');
  }, []);

  const alternar = () => {
    const nuevo = tema === 'claro' ? 'oscuro' : 'claro';
    document.documentElement.dataset.tema = nuevo;
    setTema(nuevo);
    try { localStorage.setItem('tema', nuevo); } catch (e) { /* modo privado */ }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', COLOR_FONDO[nuevo]);
  };

  const estilo = {
    background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '40px', height: '40px', flexShrink: 0, padding: 0,
  };

  // Antes de saber el tema se reserva el espacio, para que no salte el layout.
  if (tema === null) return <span style={{ ...estilo, display: 'inline-block' }} aria-hidden="true" />;

  return (
    <button
      onClick={alternar}
      style={estilo}
      aria-label={tema === 'claro' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      title={tema === 'claro' ? 'Modo oscuro' : 'Modo claro'}
    >
      {tema === 'claro' ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
