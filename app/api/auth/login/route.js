import { NextResponse } from 'next/server';
import { crearToken, NOMBRE_COOKIE } from '@/lib/auth';

export async function POST(request) {
  if (!process.env.AUTHOR_PASSWORD) {
    return NextResponse.json({ error: 'AUTHOR_PASSWORD no está configurada en el servidor.' }, { status: 500 });
  }

  const { clave } = await request.json();
  if (clave !== process.env.AUTHOR_PASSWORD) {
    return NextResponse.json({ error: 'Clave incorrecta.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(NOMBRE_COOKIE, crearToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
