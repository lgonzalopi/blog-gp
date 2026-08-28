import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import { TITULO_SITIO, C, RichText, Keywords, resumen, fecha, lectura, btn, contenedor, estiloPagina, ESTILOS_BASE, Footer } from '@/components/notas-ui';
import BotonCompartir from '@/components/BotonCompartir';

export const dynamic = 'force-dynamic';

async function obtenerNota(id) {
  const { data, error } = await supabaseAdmin()
    .from('notas')
    .select('id, titulo, cuerpo, keywords, creado_en')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    titulo: data.titulo,
    text: data.cuerpo,
    keywords: data.keywords || [],
    ts: data.creado_en,
  };
}

async function obtenerNumero(id) {
  const { data, error } = await supabaseAdmin()
    .from('notas')
    .select('id')
    .order('creado_en', { ascending: false });
  if (error || !data) return null;
  const idx = data.findIndex((n) => n.id === id);
  return idx === -1 ? null : data.length - idx;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const nota = await obtenerNota(id);
  if (!nota) return {};

  const descripcion = resumen(nota.text, 160);
  return {
    title: nota.titulo,
    description: descripcion,
    alternates: { canonical: `/notas/${id}` },
    openGraph: {
      title: nota.titulo,
      description: descripcion,
      type: 'article',
      publishedTime: nota.ts,
      url: `/notas/${id}`,
      siteName: TITULO_SITIO,
    },
    twitter: {
      card: 'summary',
      title: nota.titulo,
      description: descripcion,
    },
  };
}

export default async function NotaPage({ params }) {
  const { id } = await params;
  const [nota, numero] = await Promise.all([obtenerNota(id), obtenerNumero(id)]);
  if (!nota) notFound();

  return (
    <div style={estiloPagina}>
      <style>{ESTILOS_BASE}</style>
      <div style={contenedor}>
        {/* El tema y el candado están en la barra fija del layout. */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'clamp(28px, 7vw, 36px)' }}>
          <Link href="/" style={{ ...btn('ghost'), textDecoration: 'none' }}>
            <ArrowLeft size={13} /> Volver
          </Link>
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'baseline', marginBottom: '14px', flexWrap: 'wrap' }}>
          {numero != null && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.green }}>
              #{String(numero).padStart(3, '0')}
            </span>
          )}
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: C.muted }}>
            {fecha(nota.ts)} · {lectura(nota.text)} min de lectura
          </span>
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 'clamp(24px, 6.5vw, 32px)', lineHeight: 1.2, color: C.title, margin: '0 0 18px' }}>
          {nota.titulo}
        </h1>
        {nota.keywords.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <Keywords items={nota.keywords} />
          </div>
        )}
        <RichText texto={nota.text} size={17} />
        <div style={{ borderTop: `1px solid ${C.line}`, marginTop: '36px', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/" style={{ ...btn('ghost'), textDecoration: 'none' }}><ArrowLeft size={13} /> Todas las notas</Link>
          <BotonCompartir titulo={nota.titulo} />
        </div>
        <Footer />
      </div>
    </div>
  );
}
