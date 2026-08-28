import "./globals.css";
import { TITULO_SITIO, TEMAS_SITIO } from "@/components/notas-ui";
import { AutorProvider } from "@/components/AutorContext";
import Encabezado from "@/components/Encabezado";

// Una URL mal escrita en la variable de entorno no debe tumbar el build
// entero: se le agrega el protocolo si falta y, si aun así no es válida, se
// cae al valor por defecto. Vercel expone VERCEL_URL sin protocolo, así que
// sirve de respaldo automático antes de configurar el dominio propio.
function resolverSiteUrl() {
  const candidatos = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];
  for (const bruto of candidatos) {
    const v = (bruto || "").trim();
    if (!v) continue;
    const conProtocolo = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      return new URL(conProtocolo).origin;
    } catch {
      // valor inservible: se prueba el siguiente
    }
  }
  return "http://localhost:3000";
}

const SITE_URL = resolverSiteUrl();

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0c0e",
};

// Corre antes de pintar: sin esto la página aparece en oscuro y salta a claro
// un instante después. Lee la preferencia guardada y, si no hay, la del sistema.
const APLICAR_TEMA = `
(function () {
  try {
    var t = localStorage.getItem('tema');
    if (t !== 'claro' && t !== 'oscuro') {
      t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro';
    }
    document.documentElement.dataset.tema = t;
    if (t === 'claro') {
      var m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute('content', '#fafaf8');
    }
  } catch (e) {
    document.documentElement.dataset.tema = 'oscuro';
  }
})();
`;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITULO_SITIO,
    template: `%s — ${TITULO_SITIO}`,
  },
  description: TEMAS_SITIO,
  openGraph: {
    title: TITULO_SITIO,
    description: TEMAS_SITIO,
    siteName: TITULO_SITIO,
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary",
    title: TITULO_SITIO,
    description: TEMAS_SITIO,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-tema="oscuro" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APLICAR_TEMA }} />
      </head>
      <body>
        {/* El proveedor va acá y no dentro de cada página para que la sesión
            del autor sobreviva al navegar entre la portada y las notas. */}
        <AutorProvider>
          <Encabezado />
          {children}
        </AutorProvider>
      </body>
    </html>
  );
}
