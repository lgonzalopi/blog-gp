# El agente de ideas

Un programa que se corre a mano y propone ideas de notas para el blog. No es
parte del sitio: no se despliega, no lo ve nadie más, y solo funciona en tu
máquina porque necesita las claves de `.env.local`.

## Para qué existe

El cuello de botella de un blog personal casi nunca es escribir. Es decidir
sobre qué escribir sin repetirse, sin volverse genérico y sin tener que estar
leyendo el mundo entero todos los días.

Este agente hace ese trabajo previo. Mira todo lo que ya publicaste, sale a
buscar qué se está discutiendo hoy en tus temas, y cruza las dos cosas. Lo que
te devuelve no es una lista de temas de moda: es un puñado de tesis que
dependen de que las escribas vos, cada una con el argumento de por qué vale la
pena escribirla ahora y no en seis meses.

Lo que **no** hace: no escribe las notas, no las guarda en la base, no publica
nada. Termina donde empieza tu trabajo.

## Cómo se corre

```bash
npm run ideas
```

Eso te da 8 ideas. Si querés otra cantidad o acotar el terreno:

```bash
npm run ideas -- 12
```

```bash
npm run ideas -- --foco="agentes de IA en equipos de growth"
```

Los dos se pueden combinar (`npm run ideas -- 5 --foco="estoicismo"`). La
cantidad admite entre 1 y 20; si pedís más, lo recorta a 20.

Tarda un par de minutos, porque hace bastantes búsquedas antes de decidir. Va
imprimiendo qué está haciendo mientras trabaja: qué nota abrió, qué está
buscando. Al terminar imprime las ideas y deja el mismo contenido en
`ideas/ideas-<fecha-y-hora>.md`, para que puedas volver a rondas anteriores.

## Qué te devuelve

Arranca con un **panorama**: dos o tres frases sobre qué está pasando ahora en
tus temas y qué hueco tiene tu blog. Es el resumen de por qué eligió lo que
eligió.

Después, cada idea trae siete cosas:

| Campo | Qué es |
|---|---|
| **Título** | Tentativo, corto, sin clickbait |
| **Ángulo** | La tesis: qué defiende la nota, no de qué habla |
| **Por qué ahora** | Qué la hace oportuna este mes, apoyado en lo que encontró |
| **Gancho** | La primera frase de la nota, escrita como la escribirías vos |
| **Palabras clave** | Entre 3 y 5, listas para pegar en el editor |
| **Conversa con** | Con qué nota tuya se cruza: la extiende, la corrige o la contradice |
| **Largo estimado** | corta (~500 palabras), media (~1000) o larga |

Y las **fuentes**: las URLs que sostienen el "por qué ahora". Si una idea no
tiene fuentes, es porque no salió de una búsqueda sino del cruce con lo que ya
escribiste — cosa legítima, pero conviene saber cuál es cuál.

La distinción entre tesis y tema es todo el punto del agente. "Cómo usar IA en
growth" es un tema y no pasa el filtro. "Por qué el equipo que automatiza
reportes antes de entender la métrica termina más lento" es una tesis: se
puede estar de acuerdo o en desacuerdo con ella.

## Qué sabe y qué no

**Sabe** todo lo que publicaste: título, fecha, palabras clave y cómo arranca
cada nota. Si una idea le roza un tema que ya tocaste, abre esa nota entera
antes de proponer, para no repetirte por accidente.

**Sabe** buscar en la web, en español y en inglés, y hace varias búsquedas en
frentes distintos en vez de una sola genérica.

**No sabe** nada que no esté publicado: borradores, notas de voz, lo que
pensás escribir la semana que viene. Si tenés un plan en la cabeza, pasáselo
con `--foco`.

**No puede verificar** que una fuente sea buena. Te da la URL justamente para
que la revises antes de apoyar una nota en ella. Está instruido para no
inventar cifras ni fuentes, y en la práctica cumple, pero el "por qué ahora"
es lo primero que conviene chequear.

**No tiene memoria entre corridas.** Cada vez arranca de cero. Si corrés dos
veces seguidas puede proponerte ideas parecidas; lo que evita es repetir lo
que ya *publicaste*, no lo que ya te *propuso*.

## Cuánto cuesta

Una corrida de 2 ideas midió ~100.000 tokens de entrada y ~7.000 de salida:
alrededor de 0,70 dólares con el modelo por defecto. La mayor parte del costo
está en las búsquedas web, no en la cantidad de ideas, así que una corrida de
8 no cuesta cuatro veces más — pero sí algo más. Al final de cada corrida
imprime los tokens usados.

Si querés bajarlo, `AGENTE_ESFUERZO=medium` en `.env.local` reduce cuánto
delibera antes de responder. `low` lo abarata bastante más, a costa de ideas
más obvias.

## Qué tocar para cambiarle el comportamiento

Todo vive en [`ideas.mjs`](ideas.mjs). Lo que más rinde tocar:

| Si querés… | Tocá |
|---|---|
| Cambiar qué considera una idea buena, el tono, o qué tiene prohibido | La constante `SISTEMA` — es la descripción del puesto, en prosa |
| Agregar o sacar campos de cada idea | El esquema de `ENTREGAR_IDEAS` y las funciones `aMarkdown` / `aConsola` |
| Que busque más o menos | `max_uses` en `BUSCAR_WEB` (hoy 12) |
| Cambiar modelo o profundidad | `AGENTE_MODELO` y `AGENTE_ESFUERZO` en `.env.local`, sin tocar código |
| Cambiar el formato del archivo que deja | `aMarkdown` |

El `SISTEMA` es lo que más conviene ajustar y lo más fácil de arruinar. Está
escrito en prosa a propósito: describe a quién le escribe, qué cuenta como
idea buena y qué no debe hacer. Si las ideas te salen genéricas, el problema
casi siempre está ahí y no en el modelo.

## Cuando algo sale mal

**"Falta ANTHROPIC_API_KEY"** — estás corriendo el archivo directo con `node`
en vez de `npm run ideas`. El comando de npm es el que carga `.env.local`.

**"Sin SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"** — es una advertencia, no un
error: el agente sigue, pero a ciegas, sin saber qué ya escribiste. Las ideas
van a ser mucho peores.

**"El agente terminó sin entregar ideas"** — raro, pero pasa si se queda sin
vueltas. Volvé a correrlo pidiendo menos ideas.

**Las ideas salen genéricas** — normalmente es señal de que hay pocas notas
publicadas para cruzar, o de que el `--foco` que le diste es muy amplio. Un
foco angosto ("atribución cuando el tráfico viene de LLMs") funciona mejor
que uno ancho ("marketing").

## Cómo está armado, por arriba

El agente hace un ciclo: le pregunta al modelo, el modelo pide usar una
herramienta, se la ejecuta, se le devuelve el resultado, y así hasta que
entrega. Tiene tres herramientas:

- **`leer_nota`** — la corre este programa contra Supabase, solo lectura.
- **`web_search`** — la corre Anthropic en sus servidores; nosotros solo vemos
  las consultas y los resultados.
- **`entregar_ideas`** — el modelo la llama para entregar el resultado final,
  con la estructura ya fijada. Todo lo que no pase por acá no te llega.

Las decisiones de diseño y sus porqués (por qué el ciclo es propio y no el del
SDK, por qué la entrega sale por una herramienta y no como texto) están en
`CLAUDE.md`, en la sección "El agente de ideas". Ahí viven las razones; acá,
cómo se usa.
