import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { tokenValido, NOMBRE_COOKIE } from '@/lib/auth';

/* Dice si la cookie de autor sigue siendo válida. La cookie es httpOnly —
   el navegador no puede leerla— así que sin esta ruta el sitio olvida que
   ya iniciaste sesión cada vez que cambiás de página. */
export async function GET() {
  const jar = await cookies();
  return NextResponse.json({ autor: tokenValido(jar.get(NOMBRE_COOKIE)?.value) });
}
