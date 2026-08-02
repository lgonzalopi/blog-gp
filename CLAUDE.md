# Notas del Orquestador — blog personal de Gonzalo Pérez

## Qué es esto

Un blog personal donde publico pensamientos sobre tecnología, frameworks de
trabajo, marketing, growth, crecimiento personal y estoicismo. El objetivo es
sacar ideas de la cabeza, compartir conocimiento y construir marca personal.
El link se comparte en LinkedIn y redes.

Nació como un artefacto de Claude.ai. Este repositorio es la migración a un
sitio propio, porque el almacenamiento del artefacto no funcionaba de forma
confiable.

## Textos del sitio — fuente única

Viven en `components/notas-ui.js` (`AUTOR`, `TITULO_SITIO`,
`DESCRIPCION_SITIO`, `TEMAS_SITIO`). Portada, páginas de nota y metadatos
Open Graph los leen de ahí — cambiar solo ese archivo, nunca duplicarlos.

## Estado actual

- `notas-orquestador.jsx` (raíz) es el componente original de referencia. Ya
  migrado a `components/NotasOrquestador.jsx` — no rediseñar desde cero.
- Falta: despliegue (Vercel), dominio propio.

## Decisiones de diseño — ya tomadas, no revisar sin pedirlo

**Estética**: fondo casi negro, texto gris atenuado para lectura cómoda,
acento verde. Debe transmitir tecnología e innovación. El modo oscuro es el
tema por defecto y la identidad del sitio; el claro es una alternativa.

```
oscuro (por defecto)              claro
bg      #0B0C0E                   #FAFAF8
raised  #131417                   #FFFFFF
título  #F3F4F0                   #16181A
cuerpo  #C7C9C2                   #3A3D3F
apagado #7C7E76                   #6B6E70
verde   #3ECE8A                   #0F7A4F
línea   #24261F                   #E3E3DD
```

El verde del modo claro está oscurecido a propósito: el `#3ECE8A` original
sobre fondo claro queda en 1.7:1 de contraste, ilegible. Todos los pares de
la tabla superan 4.5:1 (WCAG AA) — verificado midiendo en el navegador.

**Cómo funciona el tema**: la paleta vive como variables CSS en
`app/globals.css`, una vez por tema, y se elige con `data-tema` en `<html>`.
El objeto `C` de `notas-ui.js` apunta a esas variables (`var(--bg)`), así que
cambiar de tema no re-renderiza React. Reglas al tocar esto:

- No concatenar alfa en hex (`${C.warn}33` daría `var(--warn)33`, inválido).
  Usar el helper `alfa(color, pct)`.
- El script inline de `app/layout.js` fija el tema antes de pintar. Sin él la
  página parpadea en oscuro antes de pasar a claro.

**Tipografía**: Space Grotesk (títulos), IBM Plex Sans (cuerpo),
IBM Plex Mono (metadatos, botones, etiquetas).

**Estructura**: lista de notas con vista previa (título, fecha, minutos de
lectura, palabras clave, primeras líneas) → clic abre la nota completa en su
propia URL (`/notas/[id]`). Los textos son largos, por eso no se muestran
completos en la portada. La lista pagina de a 5 notas.

**Palabras clave**: entre 3 y 5 por nota, para que el lector sepa de qué
trata antes de abrirla. Pulir y Refinar las proponen junto con el título
(marcador `<<<KEYWORDS>>>`), pero solo si el campo está vacío — nunca pisan
lo que escribió el autor. Se guardan en `notas.keywords` (`text[]`).

**Fecha de publicación**: el autor la elige en el editor (hoy por defecto).
Se guarda en `creado_en` y ordena la lista. Al elegir un día se le agrega la
hora actual, para que dos notas del mismo día conserven su orden.

**Compartir**: botón al pie de cada nota. En móvil abre el menú nativo
(`navigator.share`); en escritorio copia el link al portapapeles. Si el
portapapeles no está disponible — pasa fuera de https — muestra el link en un
campo para copiarlo a mano, en vez de fallar en silencio.

**Responsive mobile-first**: el layout arranca pensado para 320px y crece.
Tamaños y espaciados usan `clamp()` en vez de tamaños fijos, para escalar sin
media queries. Área táctil mínima de 40px en botones. Los estilos base
compartidos (`contenedor`, `estiloPagina`, `ESTILOS_BASE`, `Footer`) viven en
`components/notas-ui.js` — no duplicarlos por página.

**Formato de las notas**: negrillas con `**dobles asteriscos**` y bullets
con `- `. Se renderizan, no se muestran como texto plano. Las negrillas y
bullets importan mucho: ayudan al lector a saber dónde poner atención.

## Las dos funciones de edición asistida

Ambas llaman a la API de Claude. Los prompts completos están en el .jsx —
respetarlos, están afinados.

- **Pulir**: solo ortografía, tildes, puntuación. Cero intervención.
- **Refinar**: además ordena la semántica, quita muletillas de dictado,
  marca negrillas en lo clave (máx. 2-3 por párrafo) y convierte
  enumeraciones de 3+ elementos en bullets.

**Regla no negociable**: ninguna de las dos puede cambiar el vocabulario del
autor, reformular su forma de argumentar, resumir, acortar, agregar ideas
que él no escribió, ni volver el texto corporativo o genérico. Si hay duda,
se queda como él lo escribió.

Siempre debe existir un botón de **Deshacer** que devuelva el texto original.

## Bugs ya resueltos — no reintroducir

1. **No pedir JSON a la API.** Los saltos de línea del texto rompen
   `JSON.parse`. Usar los marcadores `<<<TITULO>>>` / `<<<CUERPO>>>`.
2. **La grabación por voz del navegador no funciona en iframes sandboxed.**
   En el sitio propio sí se puede implementar (Web Speech API), y es una
   función deseada. Ya implementada (botón "Dictar" junto al textarea) —
   funciona en Chrome/Edge; otros navegadores pueden no soportarla y el
   botón simplemente no aparece.
3. El texto del autor nunca debe perderse ante un error: autoguardado de
   borrador, botón de copiar, y el texto sigue en pantalla si algo falla.
4. **Probar desde el teléfono queda colgado en "Cargando…".** Next bloquea
   sus recursos de desarrollo desde una dirección que no sea localhost. Está
   resuelto con `allowedDevOrigins` en `next.config.mjs`; si la IP de la
   máquina cambia de subred, agregarla ahí. Solo afecta a `npm run dev`.

## Qué falta construir

- [x] Proyecto Next.js con el componente migrado
- [x] Grabación por voz nativa (Web Speech API, botón "Dictar")
- [x] Modo oscuro / claro con preferencia guardada
- [x] URL propia por nota (`/notas/[id]`) + Open Graph para LinkedIn
- [x] Palabras clave por nota, fecha de publicación editable y botón de
      compartir
- [x] Pulir/Refinar movidos a una ruta API server-side (`app/api/ai`), ya no
      llaman a Anthropic directo desde el navegador
- [x] Clave de autor verificada server-side (`app/api/auth`) con cookie
      httpOnly, ya no vive en texto plano en el bundle del cliente
- [x] Supabase conectado y funcionando: tabla `notas` creada, credenciales en
      `.env.local` (ver `.env.local.example`). Si faltan las variables, el
      sitio cae solo a un modo de demostración con notas de ejemplo y
      guardado de sesión, sin romperse.
- [x] Desplegado en Vercel: https://blog-gp-theta.vercel.app
      Cada push a `main` reconstruye y publica solo. `NEXT_PUBLIC_SITE_URL`
      no está cargada a propósito: el layout toma la dirección que Vercel
      expone. Al conectar el dominio propio, cargarla con protocolo.
- [ ] Dominio propio

## Tropiezos del despliegue — por si hay que repetirlo

- **Todo daba 404 aunque el build decía Ready.** El proyecto de Vercel se
  creó cuando el repo todavía no tenía el código Next.js, así que quedó con
  *Application Preset: Other* y no ejecutaba `next build`. Al reimportar hay
  que verificar que diga **Next.js**; Vercel recuerda la configuración vieja
  del repo, incluidas las variables de entorno.
- **El sitio pedía login de Vercel.** Es *Deployment Protection*, activada
  por defecto. Se apaga en Settings y vuelve a activarse si se recrea el
  proyecto. Ojo: la respuesta queda cacheada un rato después de apagarla.
- El dominio de producción es `blog-gp-theta`; `blog-gp-lgpi` es un alias y
  `blog-gp-seven` quedó del proyecto anterior, ya borrado.

## Cómo trabajar conmigo en este proyecto

- El autor no es desarrollador de oficio: es de marketing y analítica, con
  criterio técnico alto. Explicar el porqué de las decisiones, sin asumir
  vocabulario de framework.
- Hacer QA antes de entregar. Probar lo que se puede probar y decir
  explícitamente qué no se pudo verificar. No entregar funciones sin
  confirmar que funcionan.
- Ser honesto sobre las limitaciones del entorno en lugar de prometer.
