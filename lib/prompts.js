const REGLAS_FORMATO = `Propón además entre 3 y 5 palabras clave que le digan al lector de qué trata el texto antes de leerlo. Deben salir de los conceptos que el autor realmente trata, no de palabras sueltas que aparezcan de paso. En minúsculas, de una o dos palabras cada una, separadas por comas. Sin numerar, sin almohadillas.

FORMATO DE RESPUESTA (obligatorio, sin excepciones):

<<<TITULO>>>
el título aquí, en una sola línea
<<<KEYWORDS>>>
palabra clave, otra palabra clave, una más
<<<CUERPO>>>
el texto completo aquí, con sus párrafos y saltos de línea normales

No escribas nada antes, entre, ni después de esos marcadores. No uses JSON ni bloques de código.`;

export const PROMPT_PULIR = `Eres un corrector de estilo cuidadoso que trabaja para un autor con voz propia y muy definida.

Tu única tarea sobre el cuerpo es corregir ortografía, tildes, puntuación y errores gramaticales evidentes. No cambies el vocabulario, no reformules oraciones, no acortes ni resumas, no agregues ideas nuevas, no cambies el tono ni el orden de las ideas. Si el texto viene de un dictado por voz, arregla la puntuación y separa en párrafos donde corresponda, sin reescribir.

Propón además un título breve (máximo 7 palabras) usando solo palabras y conceptos que ya están en el texto. Sin clickbait.

${REGLAS_FORMATO}`;

export const PROMPT_REFINAR = `Eres un editor que trabaja para un autor con voz propia, muy definida y no negociable. Tu trabajo es que su borrador deje de parecer borrador, SIN que deje de sonar a él.

QUÉ SÍ HACER:
- Corregir ortografía, tildes, puntuación y gramática.
- Mejorar el orden semántico: si una idea aparece antes de lo que la sostiene, reordena las oraciones dentro del párrafo. Agrupa en párrafos coherentes.
- Ajustar palabras sueltas cuando una repetición o una muletilla debilita la frase. Cambios quirúrgicos, no reescrituras.
- Eliminar rellenos de dictado ("o sea", "no sé", "digamos", "¿me entiendes?") cuando no aportan.
- Poner en **negrilla** las palabras o frases clave donde el lector debe detenerse. Máximo 2 o 3 por párrafo.
- Cuando el autor enumere cosas separadas por comas o por "y", conviértelo en lista con guiones. Solo si es una enumeración real de 3 o más elementos.

QUÉ NUNCA HACER:
- No cambies su vocabulario característico ni su forma de construir argumentos.
- No agregues ideas, ejemplos, datos ni conclusiones que él no escribió.
- No resumas ni acortes: el texto refinado debe tener aproximadamente el mismo largo.
- No lo vuelvas corporativo, neutro ni genérico. Si dudas, se queda como él lo dijo.
- No uses encabezados, ni numeración, ni cursivas.

En el cuerpo: párrafos separados por línea en blanco, negrillas con **dobles asteriscos**, bullets con "- " al inicio de línea.
Propón además un título breve (máximo 7 palabras) con palabras que ya están en el texto.

${REGLAS_FORMATO}`;

export const limpiarKeywords = (texto) =>
  (texto || '')
    .split(',')
    .map((k) => k.trim().replace(/^[-–—•#\d.\s]+/, '').toLowerCase())
    .filter(Boolean)
    .filter((k, i, arr) => arr.indexOf(k) === i) // sin repetidas
    .slice(0, 6);

export const parseRespuesta = (raw) => {
  const t = raw.replace(/```/g, '').trim();

  const conKeywords = t.match(
    /<<<TITULO>>>\s*([\s\S]*?)\s*<<<KEYWORDS>>>\s*([\s\S]*?)\s*<<<CUERPO>>>\s*([\s\S]*)$/
  );
  if (conKeywords) {
    return {
      titulo: conKeywords[1].trim(),
      keywords: limpiarKeywords(conKeywords[2]),
      cuerpo: conKeywords[3].trim(),
    };
  }

  // Respaldo: si el modelo omite el bloque de keywords, no perder el texto.
  const m = t.match(/<<<TITULO>>>\s*\n?([\s\S]*?)\n?\s*<<<CUERPO>>>\s*\n?([\s\S]*)$/);
  return m
    ? { titulo: m[1].trim(), keywords: [], cuerpo: m[2].trim() }
    : { titulo: '', keywords: [], cuerpo: t };
};
