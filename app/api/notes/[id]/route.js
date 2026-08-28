import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { tokenValido, NOMBRE_COOKIE } from '@/lib/auth';
import { limpiarKeywords } from '@/lib/prompts';

// Actualiza campos de una nota ya publicada conservando su id — y por lo
// tanto su URL, que puede estar compartida en algún lado.
export async function PATCH(request, ctx) {
  const jar = await cookies();
  if (!tokenValido(jar.get(NOMBRE_COOKIE)?.value)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { titulo, text, keywords, ts } = await request.json();

  const cambios = {};
  if (typeof titulo === 'string' && titulo.trim()) cambios.titulo = titulo.trim();
  if (typeof text === 'string') {
    // Vaciar el cuerpo dejaría una nota publicada sin contenido: se rechaza.
    if (!text.trim()) {
      return NextResponse.json({ error: 'El cuerpo no puede quedar vacío.' }, { status: 400 });
    }
    cambios.cuerpo = text.trim();
  }
  if (keywords !== undefined) {
    cambios.keywords = Array.isArray(keywords)
      ? limpiarKeywords(keywords.join(','))
      : limpiarKeywords(keywords);
  }
  if (ts && !isNaN(Date.parse(ts))) cambios.creado_en = new Date(ts).toISOString();

  if (!Object.keys(cambios).length) {
    return NextResponse.json({ error: 'Nada que actualizar.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from('notas')
    .update(cambios)
    .eq('id', id)
    .select('id, titulo, cuerpo, keywords, creado_en')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'No existe esa nota.' }, { status: 404 });

  return NextResponse.json({
    nota: { id: data.id, titulo: data.titulo, text: data.cuerpo, keywords: data.keywords || [], ts: data.creado_en },
  });
}

export async function DELETE(request, ctx) {
  const jar = await cookies();
  if (!tokenValido(jar.get(NOMBRE_COOKIE)?.value)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { error } = await supabaseAdmin().from('notas').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
