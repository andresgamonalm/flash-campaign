import { guardarColeccion, leerColeccion } from './almacen'
import { ahora, idNuevo, type Env } from './entorno'

export interface EventoHistorial {
  id: string
  usuarioId: string
  usuarioEmail: string
  proyectoId?: string
  proyectoNombre?: string
  tipo: string
  detalle: string
  formato?: string
  /** Tokens que costó la llamada a Char B, cuando el evento es una generación. */
  tokens?: number
  creadoEn: string
}

const COLECCION = 'historial'
const MAXIMO = 500

export async function registrarEvento(
  env: Env,
  evento: Omit<EventoHistorial, 'id' | 'creadoEn'>,
): Promise<EventoHistorial> {
  const completo: EventoHistorial = { ...evento, id: idNuevo('ev'), creadoEn: ahora() }
  const lista = await leerColeccion<EventoHistorial>(env, COLECCION)
  lista.unshift(completo)
  // El historial es una bitácora de trabajo, no un log de auditoría infinito.
  await guardarColeccion(env, COLECCION, lista.slice(0, MAXIMO))
  return completo
}

export async function listarHistorial(env: Env, usuarioId?: string): Promise<EventoHistorial[]> {
  const lista = await leerColeccion<EventoHistorial>(env, COLECCION)
  return usuarioId ? lista.filter((e) => e.usuarioId === usuarioId) : lista
}
