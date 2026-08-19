import { conSesion, error, json, MODELOS_GEMINI, type Env } from '../../_lib/entorno'

/**
 * Qué modelos tiene de verdad esta clave de Gemini.
 *
 * Google retira modelos para las cuentas nuevas sin aviso, así que discutir por
 * el nombre de un modelo es perder el tiempo: esta ruta pregunta y responde con
 * la lista real, más el orden que seguirá Char B. Sirve para elegir con datos qué
 * poner en la variable `GEMINI_MODEL` de Cloudflare.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) =>
  conSesion(request, env, async () => {
    if (!env.GEMINI_API_KEY) {
      return error('Falta la variable GEMINI_API_KEY en Cloudflare.', 503)
    }
    const base = (env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com').replace(/\/$/, '')
    let respuesta: Response
    try {
      respuesta = await fetch(
        `${base}/v1beta/models?key=${encodeURIComponent(env.GEMINI_API_KEY)}&pageSize=200`,
      )
    } catch (e) {
      return error(`No se pudo consultar la lista de modelos: ${(e as Error).message}`, 424)
    }
    if (!respuesta.ok) {
      const detalle = await respuesta.text()
      return error(`Google respondió ${respuesta.status}: ${detalle.slice(0, 300)}`, 424)
    }
    const datos = (await respuesta.json()) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[]
    }
    const disponibles = (datos.models ?? [])
      .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m) => String(m.name ?? '').replace('models/', ''))
      .filter(Boolean)
      .sort()

    const preferido = env.GEMINI_MODEL?.trim()
    const cadena = preferido ? [preferido, ...MODELOS_GEMINI.filter((m) => m !== preferido)] : MODELOS_GEMINI
    return json({
      total: disponibles.length,
      disponibles,
      cadenaDeCharB: cadena,
      // Lo que de verdad va a usar: el primero de la cadena que exista.
      seUsara: cadena.find((m) => disponibles.includes(m)) ?? null,
      variableGeminiModel: preferido ?? null,
    })
  })
