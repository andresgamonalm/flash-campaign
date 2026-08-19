import type {
  BriefSearch,
  EventoHistorial,
  ImagenBiblioteca,
  Marca,
  Proyecto,
  ResultadoSearch,
  Rol,
  TipoEvento,
  Usuario,
} from './types'
import { MARCAS_SISTEMA } from './marcas'

export class ErrorApi extends Error {
  readonly status: number
  readonly datos: Record<string, unknown>

  constructor(mensaje: string, status: number, datos: Record<string, unknown> = {}) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.status = status
    this.datos = datos
  }
}

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await fetch(`/api${ruta}`, {
      credentials: 'same-origin',
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
        ...(init.headers ?? {}),
      },
    })
  } catch {
    throw new ErrorApi('No hay conexión con el servidor del aplicativo.', 0)
  }

  const tipo = respuesta.headers.get('content-type') ?? ''
  if (!tipo.includes('application/json')) {
    if (respuesta.ok) return undefined as T
    throw new ErrorApi(
      respuesta.status === 404
        ? 'El backend del aplicativo no está disponible en esta dirección.'
        : `El servidor respondió ${respuesta.status}.`,
      respuesta.status,
    )
  }

  const datos = (await respuesta.json()) as Record<string, unknown>
  if (!respuesta.ok) {
    throw new ErrorApi(String(datos.error ?? 'La operación no se pudo completar.'), respuesta.status, datos)
  }
  return datos as T
}

export interface EstadoServicio {
  api: boolean
  version: string
  autenticado: boolean
  cifrado?: { vueltas: number }
  almacenamiento: {
    persistente: boolean
    datos: 'd1' | 'kv' | 'memoria'
    imagenes: 'r2' | 'kv' | 'd1' | 'memoria'
    /** Nombre real del enlace encontrado en Cloudflare, para poder verificarlo. */
    enlaceD1: string | null
    enlaceKv: string | null
    enlaceR2: string | null
  }
  ia: { configurada: boolean; modelo: string }
  secretoSesion: boolean
  bibliotecaExterna: boolean
}

export const api = {
  estado: () => pedir<EstadoServicio>('/estado'),

  login: (email: string, clave: string) =>
    pedir<{ usuario: Usuario }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, clave }) }),

  logout: () => pedir<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  sesion: () => pedir<{ usuario: Usuario | null }>('/auth/sesion'),

  actualizarPerfil: (datos: { nombre?: string; correoContacto?: string; zonaHoraria?: string }) =>
    pedir<{ usuario: Usuario }>('/auth/perfil', { method: 'POST', body: JSON.stringify(datos) }),

  cambiarClave: (claveActual: string, claveNueva: string) =>
    pedir<{ ok: boolean }>('/auth/clave', { method: 'POST', body: JSON.stringify({ claveActual, claveNueva }) }),

  listarUsuarios: () => pedir<{ usuarios: Usuario[] }>('/usuarios'),

  crearUsuario: (datos: { email: string; nombre: string; rol: Rol; clave: string; zonaHoraria?: string }) =>
    pedir<{ usuario: Usuario }>('/usuarios', { method: 'POST', body: JSON.stringify(datos) }),

  actualizarUsuario: (
    id: string,
    datos: { nombre?: string; rol?: Rol; activo?: boolean; zonaHoraria?: string; claveNueva?: string },
  ) => pedir<{ usuario: Usuario }>(`/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(datos) }),

  listarMarcas: async (): Promise<Marca[]> => {
    const { marcas } = await pedir<{ marcas: Marca[] }>('/marcas')
    const porId = new Map<string, Marca>()
    for (const m of MARCAS_SISTEMA) porId.set(m.id, m)
    for (const m of marcas) porId.set(m.id, m)
    return [...porId.values()]
  },

  guardarMarca: (marca: Marca) =>
    pedir<{ marca: Marca }>('/marcas', { method: 'POST', body: JSON.stringify(marca) }),

  eliminarMarca: (id: string) => pedir<{ ok: boolean }>(`/marcas/${id}`, { method: 'DELETE' }),

  listarProyectos: () => pedir<{ proyectos: Proyecto[] }>('/proyectos'),

  obtenerProyecto: (id: string) => pedir<{ proyecto: Proyecto }>(`/proyectos/${id}`),

  guardarProyecto: (proyecto: Partial<Proyecto>) =>
    pedir<{ proyecto: Proyecto }>('/proyectos', { method: 'POST', body: JSON.stringify(proyecto) }),

  eliminarProyecto: (id: string) => pedir<{ ok: boolean }>(`/proyectos/${id}`, { method: 'DELETE' }),

  listarImagenes: () =>
    pedir<{ imagenes: ImagenBiblioteca[]; almacenamiento: string }>('/biblioteca'),

  subirImagen: (archivo: File, medidas: { ancho: number; alto: number }, etiquetas: string[] = []) => {
    const cuerpo = new FormData()
    cuerpo.append('archivo', archivo)
    cuerpo.append('ancho', String(medidas.ancho))
    cuerpo.append('alto', String(medidas.alto))
    cuerpo.append('etiquetas', etiquetas.join(','))
    return pedir<{ imagen: ImagenBiblioteca }>('/biblioteca', { method: 'POST', body: cuerpo })
  },

  eliminarImagen: (id: string) => pedir<{ ok: boolean }>(`/biblioteca/${id}`, { method: 'DELETE' }),

  listarHistorial: () => pedir<{ eventos: EventoHistorial[] }>('/historial'),

  registrarEvento: (datos: {
    tipo: TipoEvento
    detalle: string
    proyectoId?: string
    proyectoNombre?: string
    formato?: string
  }) => pedir<{ evento: EventoHistorial }>('/historial', { method: 'POST', body: JSON.stringify(datos) }),

  generarSearch: (brief: BriefSearch & { nombreCampana: string; marca?: string }) =>
    pedir<{ resultado: ResultadoSearch }>('/ia/search', { method: 'POST', body: JSON.stringify(brief) }),
}

/** Mide una imagen antes de subirla para guardar sus dimensiones reales. */
export function medirArchivo(archivo: File): Promise<{ ancho: number; alto: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      resolve({ ancho: img.naturalWidth, alto: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      resolve({ ancho: 0, alto: 0 })
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}
