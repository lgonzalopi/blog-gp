'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/* Estado de sesión del autor, compartido por el encabezado y la portada.
   Antes vivía como useState dentro de la portada: al abrir una nota (que es
   otra página) el estado se perdía y había que volver a poner la clave. Acá
   se consulta la cookie al montar, así la sesión sobrevive a la navegación. */

const Ctx = createContext(null);

export function AutorProvider({ children }) {
  const [esAutor, setEsAutor] = useState(false);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (vigente) setEsAutor(!!data.autor);
      } catch {
        if (vigente) setEsAutor(false);
      } finally {
        if (vigente) setVerificando(false);
      }
    })();
    return () => { vigente = false; };
  }, []);

  const entrar = useCallback(async (clave) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave }),
      });
      if (!res.ok) return false;
      setEsAutor(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const salir = useCallback(async () => {
    setEsAutor(false);
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* no crítico */ }
  }, []);

  return <Ctx.Provider value={{ esAutor, verificando, entrar, salir }}>{children}</Ctx.Provider>;
}

export function useAutor() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAutor debe usarse dentro de <AutorProvider>');
  return v;
}
