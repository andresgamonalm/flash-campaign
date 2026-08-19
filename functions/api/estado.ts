import {
  almacenamientoDatos,
  almacenamientoImagenes,
  almacenamientoPersistente,
  nombreEnlaceD1,
  nombreEnlaceKV,
  nombreEnlaceR2,
} from '../_lib/almacen'
import { json, sesionDe, type Env } from '../_lib/entorno'

/** Diagnóstico de despliegue: qué está enlazado y qué falta configurar. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const sesion = await sesionDe(request, env)
  return json({
    api: true,
    version: '1.2.0',
    autenticado: Boolean(sesion),
    almacenamiento: {
      persistente: almacenamientoPersistente(env),
      datos: almacenamientoDatos(env),
      imagenes: almacenamientoImagenes(env),
      enlaceD1: nombreEnlaceD1(env),
      enlaceKv: nombreEnlaceKV(env),
      enlaceR2: nombreEnlaceR2(env),
    },
    ia: {
      configurada: Boolean(env.GEMINI_API_KEY),
      modelo: env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    },
    secretoSesion: Boolean(env.SESSION_SECRET || env.JWT_SECRET),
    bibliotecaExterna: Boolean(nombreEnlaceR2(env) || env.MEDIA_MANIFEST_URL || env.MEDIA_BASE_URL),
  })
}
