import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { tokenValido, NOMBRE_COOKIE } from '@/lib/auth';
import { limpiarKeywords } from '@/lib/prompts';

const CAMPOS = 'id, titulo, cuerpo, keywords, creado_en';

const mapNota = (n) => ({
  id: n.id,
  titulo: n.titulo,
  text: n.cuerpo,
  keywords: n.keywords || [],
  ts: n.creado_en,
});

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from('notas')
    .select(CAMPOS)
    .order('creado_en', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notas: data.map(mapNota) });
}

export async function POST(request) {
  const jar = await cookies();
  if (!tokenValido(jar.get(NOMBRE_COOKIE)?.value)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { titulo, text, keywords, ts } = await request.json();
  const cuerpo = (text || '').trim();
  if (!cuerpo) return NextResponse.json({ error: 'El cuerpo no puede estar vacío.' }, { status: 400 });

  const fila = {
    titulo: (titulo || '').trim() || 'Sin título',
    cuerpo,
    keywords: Array.isArray(keywords) ? limpiarKeywords(keywords.join(',')) : limpiarKeywords(keywords),
  };

  // Fecha de publicación elegida por el autor. Si no manda ninguna (o es
  // inválida), Postgres pone el now() por defecto.
  if (ts && !isNaN(Date.parse(ts))) fila.creado_en = new Date(ts).toISOString();

  const { data, error } = await supabaseAdmin()
    .from('notas')
    .insert(fila)
    .select(CAMPOS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ nota: mapNota(data) });
}
