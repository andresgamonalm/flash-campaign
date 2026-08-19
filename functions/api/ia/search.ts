import { conSesion, cuerpoJson, error, json, MODELOS_GEMINI, type Env } from '../../_lib/entorno'
import { registrarEvento } from '../../_lib/historial'

/**
 * Char B — asistente de Google Search.
 *
 * Lee las páginas de la promoción que entrega el usuario, razona sobre producto,
 * competencia y oferta, y devuelve la propuesta de campaña de performance ya
 * ajustada a los límites de Google Ads. La clave de Gemini vive en las variables
 * de Cloudflare y nunca se expone al navegador.
 */

const LIMITE_TITULO = 30
const LIMITE_DESCRIPCION = 90
const LIMITE_RUTA = 15
const LIMITE_SITELINK_TITULO = 25
const LIMITE_SITELINK_DESC = 35
const LIMITE_DESTACADO = 25

interface Brief {
  nombreCampana?: string
  tiposAnuncio?: string[]
  accionCta?: string
  ganchoOferta?: string
  destinoCta?: string
  urlReferencia1?: string
  urlReferencia2?: string
  indicaciones?: string
  imagenes?: { nombre: string }[]
  marca?: string
}

/**
 * Tamaño máximo de HTML que se analiza por página.
 *
 * Cloudflare concede a cada petición un presupuesto de CPU muy corto, y recorrer
 * con expresiones regulares el HTML completo de un sitio comercial (que ronda el
 * megabyte) lo agota: la plataforma corta la petición y el navegador sólo ve un
 * 502 sin explicación. Con los primeros 80 KB sobra: el título, la descripción y
 * el contenido de portada viven ahí.
 */
const MAXIMO_HTML = 80_000
const MAXIMO_TEXTO = 12_000
const TIEMPO_LECTURA_MS = 8000

const ENTIDADES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
}

function limpiarHtml(html: string): string {
  // Tres pasadas en vez de doce: cada recorrido del texto cuesta CPU y aquí es
  // justo lo que escasea.
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>|<[^>]+>/gi, ' ')
    .replace(/&(?:nbsp|amp|quot|#39|apos|lt|gt);/g, (e) => ENTIDADES[e] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Descarga como mucho `MAXIMO_HTML` caracteres y corta la conexión.
 *
 * Leer la respuesta entera para quedarse con el principio desperdicia tiempo y
 * memoria, y con una página pesada basta para que la petición no termine nunca.
 */
async function leerParcial(respuesta: Response): Promise<string> {
  if (!respuesta.body) return (await respuesta.text()).slice(0, MAXIMO_HTML)
  const lector = respuesta.body.getReader()
  const decodificador = new TextDecoder()
  let acumulado = ''
  try {
    while (acumulado.length < MAXIMO_HTML) {
      const { done, value } = await lector.read()
      if (done) break
      acumulado += decodificador.decode(value, { stream: true })
    }
  } finally {
    await lector.cancel().catch(() => undefined)
  }
  return acumulado.slice(0, MAXIMO_HTML)
}

async function leerPagina(url: string): Promise<{ url: string; estado: string; texto: string; caracteres: number }> {
  if (!url) return { url, estado: 'sin URL', texto: '', caracteres: 0 }
  let destino: URL
  try {
    destino = new URL(url)
  } catch {
    return { url, estado: 'URL mal escrita', texto: '', caracteres: 0 }
  }
  if (destino.protocol !== 'https:' && destino.protocol !== 'http:') {
    return { url, estado: 'protocolo no admitido', texto: '', caracteres: 0 }
  }
  try {
    const respuesta = await fetch(destino.toString(), {
      headers: { 'user-agent': 'FlashCampaign/1.0 (+lector de briefing)', accept: 'text/html,*/*' },
      redirect: 'follow',
      // Sin límite de espera, una página lenta deja colgada toda la generación.
      signal: AbortSignal.timeout(TIEMPO_LECTURA_MS),
    })
    if (!respuesta.ok) {
      return { url, estado: `respondió ${respuesta.status}`, texto: '', caracteres: 0 }
    }
    const html = await leerParcial(respuesta)
    const titulo = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? ''
    const descripcion =
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1] ?? ''
    const texto = `TÍTULO: ${limpiarHtml(titulo)}\nDESCRIPCIÓN: ${limpiarHtml(descripcion)}\nCONTENIDO: ${limpiarHtml(html).slice(0, MAXIMO_TEXTO)}`
    return { url, estado: 'leída', texto, caracteres: texto.length }
  } catch (e) {
    return { url, estado: `no se pudo leer (${(e as Error).message})`, texto: '', caracteres: 0 }
  }
}

const ESQUEMA = {
  type: 'OBJECT',
  properties: {
    resumen: {
      type: 'OBJECT',
      properties: {
        producto: { type: 'STRING' },
        propuestaValor: { type: 'STRING' },
        publico: { type: 'STRING' },
        competencia: { type: 'ARRAY', items: { type: 'STRING' } },
        aprendizajes: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['producto', 'propuestaValor', 'publico', 'competencia', 'aprendizajes'],
    },
    grupos: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          nombre: { type: 'STRING' },
          tema: { type: 'STRING' },
          titulos: { type: 'ARRAY', items: { type: 'STRING' } },
          descripciones: { type: 'ARRAY', items: { type: 'STRING' } },
          rutas: { type: 'ARRAY', items: { type: 'STRING' } },
          palabrasClave: {
            type: 'OBJECT',
            properties: {
              amplia: { type: 'ARRAY', items: { type: 'STRING' } },
              frase: { type: 'ARRAY', items: { type: 'STRING' } },
              exacta: { type: 'ARRAY', items: { type: 'STRING' } },
            },
            required: ['amplia', 'frase', 'exacta'],
          },
        },
        required: ['nombre', 'tema', 'titulos', 'descripciones', 'rutas', 'palabrasClave'],
      },
    },
    palabrasNegativas: { type: 'ARRAY', items: { type: 'STRING' } },
    extensiones: {
      type: 'OBJECT',
      properties: {
        sitelinks: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              titulo: { type: 'STRING' },
              descripcion1: { type: 'STRING' },
              descripcion2: { type: 'STRING' },
              url: { type: 'STRING' },
            },
            required: ['titulo', 'descripcion1', 'descripcion2', 'url'],
          },
        },
        textosDestacados: { type: 'ARRAY', items: { type: 'STRING' } },
        fragmentos: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              encabezado: { type: 'STRING' },
              valores: { type: 'ARRAY', items: { type: 'STRING' } },
            },
            required: ['encabezado', 'valores'],
          },
        },
      },
      required: ['sitelinks', 'textosDestacados', 'fragmentos'],
    },
    recomendaciones: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['resumen', 'grupos', 'palabrasNegativas', 'extensiones', 'recomendaciones'],
}

const INSTRUCCION = `Eres Char B, la asistente de campañas de Google Search dentro del aplicativo Flash Campaign.

Contexto fijo del trabajo:
- Las campañas son SIEMPRE promocionales y de performance: el objetivo es vender, no dar a conocer.
- El producto principal de la cuenta es el seguro de auto todo riesgo; cuando el briefing no indique otro producto, asume ese.
- El mercado es Chile: usa español de Chile, pesos chilenos y UF cuando corresponda.

Método obligatorio antes de escribir:
1. Lee el contenido de las páginas entregadas y extrae producto, cobertura, precio, plazo, condiciones y diferenciales reales.
2. Deduce a qué competencia se enfrenta la promoción y qué argumento la supera.
3. Define el público que compra y su intención de búsqueda.
4. Recién entonces redacta los anuncios.

Reglas de redacción:
- Títulos: máximo 30 caracteres, sin excepción. Cuenta los caracteres uno por uno antes de responder.
- Descripciones: máximo 90 caracteres.
- Rutas de visualización: máximo 15 caracteres cada una, sin espacios.
- Textos destacados: máximo 25 caracteres. Títulos de sitelink: máximo 25. Descripciones de sitelink: máximo 35.
- Entrega 15 títulos y 4 descripciones por grupo de anuncios.
- Incluye el gancho comercial, el CTA solicitado, la marca y al menos tres títulos con cifras u ofertas concretas.
- Nada de mayúsculas completas, signos de exclamación dobles ni promesas que la página no respalde.
- No inventes precios, coberturas, plazos ni beneficios que no aparezcan en el material entregado.

Palabras clave:
- Entrega concordancia amplia, de frase y exacta por separado, ya escritas con su sintaxis: amplia sin comillas, frase entre comillas, exacta entre corchetes.
- Prioriza intención transaccional (cotizar, contratar, precio, online) por sobre intención informativa.
- Palabras negativas: incluye términos de empleo, gratis, trámite, siniestro, reclamo, curso y todo lo que atraiga tráfico que no compra.

Responde exclusivamente con el JSON del esquema pedido, en español.`

function recortar(texto: string, limite: number): string {
  const limpio = texto.replace(/\s+/g, ' ').trim()
  if (limpio.length <= limite) return limpio
  const corte = limpio.slice(0, limite)
  const espacio = corte.lastIndexOf(' ')
  return (espacio > limite * 0.6 ? corte.slice(0, espacio) : corte).trim()
}

interface Resultado {
  resumen: Record<string, unknown>
  grupos: {
    nombre: string
    tema: string
    titulos: string[]
    descripciones: string[]
    rutas: string[]
    palabrasClave: { amplia: string[]; frase: string[]; exacta: string[] }
  }[]
  palabrasNegativas: string[]
  extensiones: {
    sitelinks: { titulo: string; descripcion1: string; descripcion2: string; url: string }[]
    textosDestacados: string[]
    fragmentos: { encabezado: string; valores: string[] }[]
  }
  recomendaciones: string[]
}

/** Segunda barrera: el modelo puede pasarse de largo, el aplicativo no. */
function normalizar(resultado: Resultado): Resultado {
  return {
    ...resultado,
    grupos: (resultado.grupos ?? []).map((g) => ({
      ...g,
      titulos: (g.titulos ?? []).map((t) => recortar(t, LIMITE_TITULO)).filter(Boolean),
      descripciones: (g.descripciones ?? []).map((d) => recortar(d, LIMITE_DESCRIPCION)).filter(Boolean),
      rutas: (g.rutas ?? []).map((r) => recortar(r.replace(/\s+/g, ''), LIMITE_RUTA)).filter(Boolean).slice(0, 2),
      palabrasClave: {
        amplia: g.palabrasClave?.amplia ?? [],
        frase: g.palabrasClave?.frase ?? [],
        exacta: g.palabrasClave?.exacta ?? [],
      },
    })),
    extensiones: {
      sitelinks: (resultado.extensiones?.sitelinks ?? []).map((s) => ({
        titulo: recortar(s.titulo, LIMITE_SITELINK_TITULO),
        descripcion1: recortar(s.descripcion1, LIMITE_SITELINK_DESC),
        descripcion2: recortar(s.descripcion2, LIMITE_SITELINK_DESC),
        url: s.url,
      })),
      textosDestacados: (resultado.extensiones?.textosDestacados ?? []).map((t) => recortar(t, LIMITE_DESTACADO)),
      fragmentos: resultado.extensiones?.fragmentos ?? [],
    },
  }
}

async function llamarGemini(env: Env, prompt: string): Promise<{ datos: Resultado; modelo: string }> {
  const preferido = env.GEMINI_MODEL?.trim()
  const modelos = preferido ? [preferido, ...MODELOS_GEMINI.filter((m) => m !== preferido)] : MODELOS_GEMINI
  let ultimoError = 'No se pudo contactar a Gemini.'

  for (const modelo of modelos) {
    const base = (env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com').replace(/\/$/, '')
    const respuesta = await fetch(
      `${base}/v1beta/models/${modelo}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY as string },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: INSTRUCCION }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.65,
            topP: 0.9,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            responseSchema: ESQUEMA,
          },
        }),
      },
    )

    if (respuesta.status === 404) {
      ultimoError = `El modelo ${modelo} no está disponible para esta clave.`
      continue
    }
    if (!respuesta.ok) {
      const detalle = await respuesta.text()
      ultimoError = `Gemini respondió ${respuesta.status}: ${detalle.slice(0, 300)}`
      if (respuesta.status === 400 || respuesta.status === 403) break
      continue
    }

    const cuerpo = (await respuesta.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
      promptFeedback?: { blockReason?: string }
    }
    if (cuerpo.promptFeedback?.blockReason) {
      throw new Error(`Gemini bloqueó la solicitud (${cuerpo.promptFeedback.blockReason}).`)
    }
    const texto = cuerpo.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
    if (!texto) {
      ultimoError = 'Gemini devolvió una respuesta vacía.'
      continue
    }
    try {
      return { datos: JSON.parse(texto) as Resultado, modelo }
    } catch {
      ultimoError = 'Gemini devolvió un JSON que no se pudo interpretar.'
    }
  }
  throw new Error(ultimoError)
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  conSesion(request, env, async (sesion) => {
    if (!env.GEMINI_API_KEY) {
      return error(
        'Falta la variable GEMINI_API_KEY en Cloudflare. Char B no puede generar anuncios sin ella.',
        503,
        { configuracionPendiente: 'GEMINI_API_KEY' },
      )
    }

    let paso = 'leer el briefing'
    try {
    const brief = await cuerpoJson<Brief>(request)
    if (!brief.ganchoOferta?.trim()) return error('Escribe el gancho u oferta comercial.', 422)
    if (!brief.destinoCta?.trim()) return error('Indica el destino del CTA (la URL de la promoción).', 422)

    paso = 'leer las páginas de la promoción'
    const paginas = await Promise.all(
      [brief.destinoCta, brief.urlReferencia1, brief.urlReferencia2]
        .filter((u): u is string => Boolean(u && u.trim()))
        .map(leerPagina),
    )

    const leidas = paginas.filter((p) => p.estado === 'leída')
    const prompt = [
      `CAMPAÑA: ${brief.nombreCampana ?? 'Sin nombre'}`,
      `MARCA: ${brief.marca ?? 'Zurich'}`,
      `TIPOS DE ANUNCIO SOLICITADOS: ${(brief.tiposAnuncio ?? []).join(', ') || 'anuncios de búsqueda responsivos'}`,
      `ACCIÓN / CTA: ${brief.accionCta ?? ''}`,
      `GANCHO U OFERTA COMERCIAL: ${brief.ganchoOferta}`,
      `DESTINO DEL CTA: ${brief.destinoCta}`,
      brief.urlReferencia1 ? `URL DE REFERENCIA 1: ${brief.urlReferencia1}` : '',
      brief.urlReferencia2 ? `URL DE REFERENCIA 2: ${brief.urlReferencia2}` : '',
      brief.imagenes?.length ? `PIEZAS GRÁFICAS ASOCIADAS: ${brief.imagenes.map((i) => i.nombre).join(', ')}` : '',
      brief.indicaciones ? `INDICACIONES GENERALES DEL USUARIO: ${brief.indicaciones}` : '',
      '',
      leidas.length
        ? `CONTENIDO LEÍDO DE LAS PÁGINAS (${leidas.length}):\n${leidas.map((p) => `--- ${p.url} ---\n${p.texto}`).join('\n\n')}`
        : 'ATENCIÓN: no se pudo leer ninguna página. Trabaja sólo con el briefing, no inventes datos de producto y adviértelo en las recomendaciones.',
      '',
      'Entrega entre 2 y 3 grupos de anuncios con temas distintos y no repitas títulos entre grupos.',
    ]
      .filter(Boolean)
      .join('\n')

    paso = 'consultar a Char B'
    try {
      const { datos, modelo } = await llamarGemini(env, prompt)
      const resultado = {
        ...normalizar(datos),
        generadoEn: new Date().toISOString(),
        modelo,
        fuentesLeidas: paginas.map((p) => ({ url: p.url, estado: p.estado, caracteres: p.caracteres })),
      }
      await registrarEvento(env, {
        usuarioId: sesion.uid,
        usuarioEmail: sesion.email,
        proyectoNombre: brief.nombreCampana,
        tipo: 'search_generado',
        detalle: `Char B generó ${resultado.grupos.length} grupo(s) de anuncios con ${modelo}`,
      })
      return json({ resultado })
    } catch (e) {
      return error((e as Error).message, 502)
    }
    } catch (e) {
      // Un fallo aquí llegaba al navegador como un 502 sin texto y no había forma
      // de saber en qué punto se rompió.
      return error(`Falló al ${paso}: ${(e as Error)?.message ?? 'error desconocido'}`, 500)
    }
  })
