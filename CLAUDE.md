# Notas de un orquestador — blog personal de Gonzalo

## Qué es esto

Un blog personal donde publico pensamientos sobre tecnología, frameworks de
trabajo, marketing, growth, crecimiento personal y estoicismo. El objetivo es
sacar ideas de la cabeza, compartir conocimiento y construir marca personal.
El link se comparte en LinkedIn y redes.

Nació como un artefacto de Claude.ai. Este repositorio es la migración a un
sitio propio, porque el almacenamiento del artefacto no funcionaba de forma
confiable.

## Estado actual

- `notas-orquestador.jsx` es el componente original, funcional, con todo el
  diseño ya resuelto. Es el punto de partida — no rediseñar desde cero.
- Falta: proyecto real (Next.js), base de datos (Supabase), autenticación,
  despliegue (Vercel), dominio propio.

## Decisiones de diseño — ya tomadas, no revisar sin pedirlo

**Estética**: fondo casi negro, texto gris atenuado para lectura cómoda,
acento verde. Debe transmitir tecnología e innovación.

```
bg      #0B0C0E     título   #F3F4F0     verde  #3ECE8A
raised  #131417     cuerpo   #C7C9C2     línea  #24261F
                    apagado  #7C7E76
```

**Tipografía**: Space Grotesk (títulos), IBM Plex Sans (cuerpo),
IBM Plex Mono (metadatos, botones, etiquetas).

**Estructura**: lista de notas con vista previa (título, fecha, minutos de
lectura, primeras líneas) → clic abre la nota completa. Los textos son
largos, por eso no se muestran completos en la portada.

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
   función deseada. Verificar antes de entregarla.
3. El texto del autor nunca debe perderse ante un error: autoguardado de
   borrador, botón de copiar, y el texto sigue en pantalla si algo falla.

## Qué falta construir

- [ ] Proyecto Next.js con el componente migrado
- [ ] Supabase: tabla de notas + autenticación real (solo el autor publica)
- [ ] URL propia por nota, para compartir una sola en redes
- [ ] Metadatos Open Graph, para que el link se vea bien en LinkedIn
- [ ] Despliegue en Vercel + dominio propio
- [ ] Grabación por voz nativa

## Cómo trabajar conmigo en este proyecto

- El autor no es desarrollador de oficio: es de marketing y analítica, con
  criterio técnico alto. Explicar el porqué de las decisiones, sin asumir
  vocabulario de framework.
- Hacer QA antes de entregar. Probar lo que se puede probar y decir
  explícitamente qué no se pudo verificar. No entregar funciones sin
  confirmar que funcionan.
- Ser honesto sobre las limitaciones del entorno en lugar de prometer.
