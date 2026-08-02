/** @type {import('next').NextConfig} */
const nextConfig = {
  // Solo afecta a `npm run dev`. Sin esto, Next bloquea sus recursos de
  // desarrollo cuando el sitio se abre desde otra dirección que no sea
  // localhost, y la página queda colgada en "Cargando…" al probarla desde
  // el teléfono. En producción (Vercel) esta opción no se usa.
  // Van por comodín a propósito: el router reasigna la IP de la máquina cada
  // tanto (ya pasó de .100 a .101) y con una IP fija habría que editar esto
  // cada vez.
  allowedDevOrigins: ['192.168.0.*', '192.168.1.*', '192.168.8.*'],
};

export default nextConfig;
