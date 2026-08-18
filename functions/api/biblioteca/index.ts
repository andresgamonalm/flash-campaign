import {
  almacenamientoImagenes,
  guardarBinario,
  guardarColeccion,
  leerColeccion,
  listarImagenesDelBucket,
} from '../../_lib/almacen'
import { ahora, conSesion, error, idNuevo, json, type Env } from '../../_lib/entorno'
import { registrarEvento } from '../../_lib/historial'

export interface ImagenBiblioteca {
  id: string
  nombre: string
  src: string
  ancho: number
  alto: number
  peso: number
  propietarioId: string | null
  origen: 'cloudflare' | 'usuario' | 'proyecto'
  etiquetas: string[]
  creadoEn: string
  clave?: string
  tipo?: string
}

const COLECCION = 'imagenes'
const PESO_MAXIMO = 10 * 1024 * 1024
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

/** Catálogo ya cargado en Cloudflare más el material que viaja con el proyecto. */
async function catalogoBase(env: Env, origen: URL): Promise<ImagenBiblioteca[]> {
  const externas: ImagenBiblioteca[] = []

  // Fuente principal: las imágenes que ya viven en el bucket R2 de la cuenta.
  const enBucket = await listarImagenesDelBucket(env).catch(() => [])
  for (const objeto of enBucket) {
    externas.push({
      id: `r2:${objeto.clave}`,
      nombre: objeto.nombre,
      src: env.MEDIA_BASE_URL
        ? `${env.MEDIA_BASE_URL.replace(/\/$/, '')}/${objeto.clave}`
        : `/api/biblioteca/objeto?clave=${encodeURIComponent(objeto.clave)}`,
      ancho: 0,
      alto: 0,
      peso: objeto.peso,
      propietarioId: null,
      origen: 'cloudflare',
      // La ruta dentro del bucket sirve de etiqueta para poder buscar por carpeta.
      etiquetas: objeto.clave.split('/').slice(0, -1).filter(Boolean),
      creadoEn: objeto.subidoEn,
      clave: objeto.clave,
      tipo: objeto.tipo,
    })
  }

  if (env.MEDIA_MANIFEST_URL) {
    try {
      const respuesta = await fetch(env.MEDIA_MANIFEST_URL, { cf: { cacheTtl: 300 } })
      if (respuesta.ok) {
        const datos = (await respuesta.json()) as { imagenes?: ImagenBiblioteca[] }
        for (const img of datos.imagenes ?? []) {
          externas.push({
            ...img,
            origen: 'cloudflare',
            propietarioId: null,
            src: img.src.startsWith('http') || !env.MEDIA_BASE_URL ? img.src : `${env.MEDIA_BASE_URL.replace(/\/$/, '')}/${img.src.replace(/^\//, '')}`,
          })
        }
      }
    } catch {
      /* Un manifiesto caído no debe impedir usar la biblioteca propia. */
    }
  }

  try {
    const respuesta = await fetch(new URL('/biblioteca/manifiesto.json', origin(origen)))
    if (respuesta.ok) {
      const datos = (await respuesta.json()) as { imagenes?: ImagenBiblioteca[] }
      externas.push(...(datos.imagenes ?? []))
    }
  } catch {
    /* Sin manifiesto local la biblioteca sigue funcionando con lo subido. */
  }

  return externas
}

function origin(url: URL): string {
  return `${url.protocol}//${url.host}`
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) =>
  conSesion(request, env, async (sesion) => {
    const subidas = await leerColeccion<ImagenBiblioteca>(env, COLECCION)
    // El administrador ve todo el material; cada usuario ve el suyo y el común.
    const propias = sesion.rol === 'admin' ? subidas : subidas.filter((i) => i.propietarioId === sesion.uid)
    const base = await catalogoBase(env, new URL(request.url))
    const imagenes = [...propias, ...base].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
    return json({ imagenes, almacenamiento: almacenamientoImagenes(env) })
  })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  conSesion(request, env, async (sesion) => {
    const formulario = await request.formData().catch(() => null)
    if (!formulario) return error('Envía la imagen como formulario con el campo "archivo".', 400)

    const archivo = formulario.get('archivo') as unknown as
      | { name?: string; type?: string; size?: number; arrayBuffer: () => Promise<ArrayBuffer> }
      | null
    if (!archivo || typeof archivo.arrayBuffer !== 'function') return error('No llegó ningún archivo.', 422)
    const tipo = archivo.type ?? ''
    const tamano = archivo.size ?? 0
    if (!TIPOS.includes(tipo)) {
      return error('Formato no admitido. Usa JPG, PNG, WEBP, GIF o SVG.', 415)
    }
    if (tamano > PESO_MAXIMO) {
      return error('La imagen supera los 10 MB. Comprímela antes de subirla.', 413)
    }

    const ancho = Number(formulario.get('ancho') ?? 0)
    const alto = Number(formulario.get('alto') ?? 0)
    const etiquetas = String(formulario.get('etiquetas') ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const id = idNuevo('img')
    const clave = `img/${id}`
    await guardarBinario(env, clave, await archivo.arrayBuffer(), tipo)

    const imagen: ImagenBiblioteca = {
      id,
      nombre: archivo.name || 'Imagen sin nombre',
      src: `/api/biblioteca/${id}`,
      ancho,
      alto,
      peso: tamano,
      propietarioId: sesion.uid,
      origen: 'usuario',
      etiquetas,
      creadoEn: ahora(),
      clave,
      tipo,
    }

    const subidas = await leerColeccion<ImagenBiblioteca>(env, COLECCION)
    await guardarColeccion(env, COLECCION, [...subidas, imagen])
    await registrarEvento(env, {
      usuarioId: sesion.uid,
      usuarioEmail: sesion.email,
      tipo: 'imagen_subida',
      detalle: `Subió ${imagen.nombre} a la biblioteca`,
    })

    return json({ imagen }, { status: 201 })
  })
