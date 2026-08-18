import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ErrorApi, type EstadoServicio } from './api'
import type { Usuario } from './types'

interface ContextoSesion {
  usuario: Usuario | null
  estadoServicio: EstadoServicio | null
  cargando: boolean
  entrar: (email: string, clave: string) => Promise<void>
  salir: () => Promise<void>
  refrescar: () => Promise<void>
  actualizarUsuarioLocal: (usuario: Usuario) => void
  esAdmin: boolean
}

const Contexto = createContext<ContextoSesion | null>(null)

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [estadoServicio, setEstadoServicio] = useState<EstadoServicio | null>(null)
  const [cargando, setCargando] = useState(true)

  const refrescar = useCallback(async () => {
    try {
      const [{ usuario: actual }, estado] = await Promise.all([
        api.sesion(),
        api.estado().catch(() => null),
      ])
      setUsuario(actual)
      setEstadoServicio(estado)
    } catch (e) {
      setUsuario(null)
      if (e instanceof ErrorApi && e.status === 0) setEstadoServicio(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void refrescar()
  }, [refrescar])

  const entrar = useCallback(
    async (email: string, clave: string) => {
      const { usuario: nuevo } = await api.login(email, clave)
      setUsuario(nuevo)
      setEstadoServicio(await api.estado().catch(() => null))
    },
    [],
  )

  const salir = useCallback(async () => {
    await api.logout().catch(() => undefined)
    setUsuario(null)
  }, [])

  const valor = useMemo<ContextoSesion>(
    () => ({
      usuario,
      estadoServicio,
      cargando,
      entrar,
      salir,
      refrescar,
      actualizarUsuarioLocal: setUsuario,
      esAdmin: usuario?.rol === 'admin',
    }),
    [usuario, estadoServicio, cargando, entrar, salir, refrescar],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSesion(): ContextoSesion {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useSesion debe usarse dentro de ProveedorSesion.')
  return contexto
}
