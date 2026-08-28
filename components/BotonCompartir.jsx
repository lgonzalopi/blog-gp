'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { C, btn } from './notas-ui';

export default function BotonCompartir({ titulo }) {
  const [estado, setEstado] = useState(null); // null | 'copiado' | 'manual'
  const [url, setUrl] = useState('');

  const compartir = async () => {
    const enlace = window.location.href;

    // En el teléfono abre el menú nativo (WhatsApp, LinkedIn, etc.).
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, url: enlace });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return; // el usuario cerró el menú
        // cualquier otro fallo: sigue al portapapeles
      }
    }

    try {
      await navigator.clipboard.writeText(enlace);
      setEstado('copiado');
      setTimeout(() => setEstado(null), 2200);
    } catch (e) {
      // El portapapeles necesita https. Mostramos el link para copiarlo a mano.
      setUrl(enlace);
      setEstado('manual');
    }
  };

  // Alineado a la derecha para que el campo de respaldo caiga bajo el botón.
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
      <button
        onClick={compartir}
        style={estado === 'copiado' ? { ...btn('ghost'), color: C.green, border: `1px solid ${C.green}` } : btn('ghost')}
        aria-label="Compartir esta nota"
      >
        {estado === 'copiado' ? <Check size={13} /> : <Share2 size={13} />}
        {estado === 'copiado' ? 'Link copiado' : 'Compartir'}
      </button>

      {estado === 'manual' && (
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          aria-label="Link de la nota, selecciónalo para copiarlo"
          style={{
            width: 'min(100%, 320px)', background: C.raised, border: `1px solid ${C.line}`,
            borderRadius: '3px', padding: '8px 10px', color: C.body,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', outline: 'none',
          }}
        />
      )}
    </div>
  );
}
