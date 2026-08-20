import { useCallback, useRef, useState } from 'react'

/**
 * Deshacer y rehacer del editor.
 *
 * Guarda instantáneas completas del diseño. Es la opción más simple y la más
 * fiable: cualquier cambio —mover, redimensionar, cambiar un color, borrar,
 * replicar los 19 formatos— queda cubierto sin tener que describir cada acción
 * por separado, que es donde estos sistemas se vuelven frágiles.
 *
 * Un diseño completo ronda unas decenas de kilobytes, así que un tope de 50
 * pasos es holgado en memoria y suficiente para deshacer cualquier tanteo.
 *
 * Los estados se guardan serializados: si se guardara la referencia al objeto,
 * un cambio posterior podría alterar el pasado y "deshacer" devolvería el estado
 * equivocado.
 */

const MAXIMO_PASOS = 50

export interface Deshacer<T> {
  /** Registra un estado ya aplicado, para poder volver a él. */
  registrar: (estado: T) => void
  /** Sustituye el punto de partida sin crear un paso (al cargar el proyecto). */
  reiniciar: (estado: T) => void
  deshacer: () => T | null
  rehacer: () => T | null
  puedeDeshacer: boolean
  puedeRehacer: boolean
}

export function useDeshacer<T>(): Deshacer<T> {
  const pasados = useRef<string[]>([])
  const futuros = useRef<string[]>([])
  const presente = useRef<string | null>(null)
  const [, forzarPintado] = useState(0)

  const anunciar = useCallback(() => forzarPintado((n) => n + 1), [])

  const reiniciar = useCallback(
    (estado: T) => {
      pasados.current = []
      futuros.current = []
      presente.current = JSON.stringify(estado)
      anunciar()
    },
    [anunciar],
  )

  const registrar = useCallback(
    (estado: T) => {
      const serializado = JSON.stringify(estado)
      // Un cambio que no cambia nada no merece un paso: si no, pulsar deshacer
      // parecería no hacer nada varias veces seguidas.
      if (serializado === presente.current) return
      if (presente.current !== null) {
        pasados.current.push(presente.current)
        if (pasados.current.length > MAXIMO_PASOS) pasados.current.shift()
      }
      presente.current = serializado
      futuros.current = []
      anunciar()
    },
    [anunciar],
  )

  const deshacer = useCallback((): T | null => {
    const anterior = pasados.current.pop()
    if (anterior === undefined) return null
    if (presente.current !== null) futuros.current.push(presente.current)
    presente.current = anterior
    anunciar()
    return JSON.parse(anterior) as T
  }, [anunciar])

  const rehacer = useCallback((): T | null => {
    const siguiente = futuros.current.pop()
    if (siguiente === undefined) return null
    if (presente.current !== null) pasados.current.push(presente.current)
    presente.current = siguiente
    anunciar()
    return JSON.parse(siguiente) as T
  }, [anunciar])

  return {
    registrar,
    reiniciar,
    deshacer,
    rehacer,
    puedeDeshacer: pasados.current.length > 0,
    puedeRehacer: futuros.current.length > 0,
  }
}
