import "./globals.css";
import { TITULO_SITIO, DESCRIPCION_SITIO } from "@/components/notas-ui";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
  description: DESCRIPCION_SITIO,
  openGraph: {
    title: TITULO_SITIO,
    description: DESCRIPCION_SITIO,
    siteName: TITULO_SITIO,
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary",
    title: TITULO_SITIO,
    description: DESCRIPCION_SITIO,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-tema="oscuro" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APLICAR_TEMA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
