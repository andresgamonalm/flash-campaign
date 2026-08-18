import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Aviso, Boton, Cargando, EstadoVacio, useAvisar, useConfirmacion } from '../components/ui'
import { api } from '../lib/api'
import { useSesion } from '../lib/sesion'
import { fecha } from '../lib/formato'
import type { EstadoProyecto, Proyecto } from '../lib/types'

interface Props {
  estado: EstadoProyecto
}

export function Proyectos({ estado }: Props) {
  const { usuario, esAdmin } = useSesion()
  const navegar = useNavigate()
  const avisar = useAvisar()
  const { confirmar, dialogo } = useConfirmacion()

  const [proyectos, setProyectos] = useState<Proyecto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    try {
      const { proyectos: lista } = await api.listarProyectos()
      setProyectos(lista)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return (proyectos ?? [])
      .filter((p) => p.estado === estado)
      .filter((p) => !texto || p.nombre.toLowerCase().includes(texto))
  }, [proyectos, estado, busqueda])

  async function cambiarEstado(proyecto: Proyecto) {
    const nuevo: EstadoProyecto = proyecto.estado === 'realizado' ? 'en_curso' : 'realizado'
    try {
      const completo = await api.obtenerProyecto(proyecto.id)
      await api.guardarProyecto({ ...completo.proyecto, estado: nuevo })
      await api.registrarEvento({
        tipo: nuevo === 'realizado' ? 'proyecto_cerrado' : 'proyecto_reabierto',
        detalle: nuevo === 'realizado' ? 'Marcó la campaña como realizada' : 'Reabrió la campaña',
        proyectoId: proyecto.id,
        proyectoNombre: proyecto.nombre,
      })
      avisar(nuevo === 'realizado' ? 'Campaña marcada como realizada.' : 'Campaña reabierta.', 'exito')
      void cargar()
    } catch (e) {
      avisar((e as Error).message, 'error')
    }
  }

  async function eliminar(proyecto: Proyecto) {
    const ok = await confirmar(
      'Eliminar campaña',
      `Se eliminará "${proyecto.nombre}" con su briefing, sus anuncios y todos sus banners. Esta acción no se puede deshacer.`,
      'Eliminar',
    )
    if (!ok) return
    try {
      await api.eliminarProyecto(proyecto.id)
      avisar('Campaña eliminada.', 'exito')
      void cargar()
    } catch (e) {
      avisar((e as Error).message, 'error')
    }
  }

  const titulo = estado === 'realizado' ? 'Proyectos realizados' : 'Proyectos en curso'

  return (
    <div className="seccion">
      {dialogo}

      <div className="seccion__cabecera">
        <div>
          <h2>{titulo}</h2>
          <p style={{ color: 'var(--txt-suave)' }}>
            {estado === 'realizado'
              ? 'Campañas cerradas. Puedes reabrirlas para retomar el trabajo.'
              : 'Campañas activas: briefing de Search, lienzos y exportaciones pendientes.'}
          </p>
        </div>
        <Boton icono="mas" onClick={() => navegar('/campanas/nueva')}>
          Crear campaña
        </Boton>
      </div>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <div className="panel seccion">
        <label className="campo" style={{ maxWidth: 380 }}>
          <span className="campo__label">Buscar por nombre</span>
          <input
            className="input"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Escribe parte del nombre"
          />
        </label>

        {!proyectos ? (
          <Cargando texto="Cargando campañas…" />
        ) : visibles.length === 0 ? (
          <EstadoVacio
            titulo={busqueda ? 'Ninguna campaña coincide' : `Sin campañas ${estado === 'realizado' ? 'realizadas' : 'en curso'}`}
            descripcion={
              busqueda
                ? 'Prueba con otra palabra o revisa la otra bandeja de proyectos.'
                : estado === 'realizado'
                  ? 'Cuando termines una campaña, márcala como realizada y aparecerá aquí.'
                  : 'Crea la primera campaña y elige si trabajas Search, Display, Meta o las tres.'
            }
            accion={
              !busqueda && estado !== 'realizado' ? (
                <Boton icono="mas" onClick={() => navegar('/campanas/nueva')}>
                  Crear campaña
                </Boton>
              ) : undefined
            }
          />
        ) : (
          <div className="tabla-scroll">
            <table className="tabla">
              <caption className="visually-hidden">{titulo}</caption>
              <thead>
                <tr>
                  <th scope="col">Campaña</th>
                  <th scope="col">Plataformas</th>
                  <th scope="col">Creada</th>
                  <th scope="col">Actualizada</th>
                  {esAdmin ? <th scope="col">Responsable</th> : null}
                  <th scope="col"><span className="visually-hidden">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" style={{ fontWeight: 500, color: 'var(--txt-principal)' }}>
                      {p.nombre}
                    </th>
                    <td>{p.canales.join(' · ')}</td>
                    <td>{fecha(p.creadoEn, usuario?.zonaHoraria)}</td>
                    <td>{fecha(p.actualizadoEn, usuario?.zonaHoraria)}</td>
                    {esAdmin ? <td>{(p as Proyecto & { propietarioEmail?: string }).propietarioEmail ?? '—'}</td> : null}
                    <td>
                      <div className="acciones-fila">
                        {p.canales.includes('search') ? (
                          <Link className="btn btn--secundario btn--sm" to={`/campanas/${p.id}/search`}>
                            Search
                          </Link>
                        ) : null}
                        {p.canales.some((c) => c !== 'search') ? (
                          <Link className="btn btn--secundario btn--sm" to={`/campanas/${p.id}/editor`}>
                            Editor
                          </Link>
                        ) : null}
                        <Boton variante="terciario" pequeno onClick={() => cambiarEstado(p)}>
                          {p.estado === 'realizado' ? 'Reabrir' : 'Marcar realizada'}
                        </Boton>
                        <Boton variante="terciario" pequeno onClick={() => eliminar(p)}>
                          Eliminar
                        </Boton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
