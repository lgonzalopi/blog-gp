import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { tokenValido, NOMBRE_COOKIE } from '@/lib/auth';
import { PROMPT_PULIR, PROMPT_REFINAR, parseRespuesta } from '@/lib/prompts';

export async function POST(request) {
  const jar = await cookies();
  if (!tokenValido(jar.get(NOMBRE_COOKIE)?.value)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no está configurada en el servidor.' }, { status: 500 });
  }

  const { modo, titulo, cuerpo } = await request.json();
  const texto = (cuerpo || '').trim();
  if (!texto) return NextResponse.json({ error: 'El cuerpo no puede estar vacío.' }, { status: 400 });

  const contenido = (titulo || '').trim()
    ? `Título propuesto por el autor (respétalo, solo corrige ortografía si hace falta): ${titulo.trim()}\n\nCuerpo:\n${texto}`
    : texto;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4000,
        thinking: { type: 'disabled' },
        output_config: { effort: 'low' },
        system: modo === 'refinar' ? PROMPT_REFINAR : PROMPT_PULIR,
        messages: [{ role: 'user', content: contenido }],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'la API devolvió un error');

    const raw = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    if (!raw.trim()) throw new Error('respuesta vacía');

    const { titulo: nt, keywords: nk, cuerpo: nc } = parseRespuesta(raw);
    if (!nc.trim()) throw new Error('no se encontró el cuerpo');

    return NextResponse.json({ titulo: nt, keywords: nk, cuerpo: nc });
  } catch (e) {
    return NextResponse.json({ error: (e && e.message) || String(e) }, { status: 502 });
  }
}
