import { NextResponse } from 'next/server';
import { NOMBRE_COOKIE } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(NOMBRE_COOKIE);
  return res;
}
