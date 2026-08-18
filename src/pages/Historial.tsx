import { useEffect, useMemo, useState } from 'react'
import { Aviso, Cargando, EstadoVacio, Tabs } from '../components/ui'
import { api } from '../lib/api'
import { useSesion } from '../lib/sesion'
import { fecha } from '../lib/formato'
import type { EventoHistorial, TipoEvento } from '../lib/types'

const NOMBRES: Record<TipoEvento, string> = {
  proyecto_creado: 'Campaña creada',
  proyecto_actualizado: 'Campaña actualizada',
  proyecto_cerrado: 'Campaña realizada',
  proyecto_reabierto: 'Campaña reabierta',
  search_generado: 'Anuncios de Search generados',
  banner_guardado: 'Diseño guardado',
  banners_replicados: 'Formatos replicados',
  exportacion: 'Exportación',
  imagen_subida: 'Imagen subida',
  marca_creada: 'Marca creada',
  usuario_creado: 'Usuario creado',
  sesion_iniciada: 'Inicio de sesión',
}

type Filtro = 'todo' | 'exportacion' | 'creacion'

export function Historial() {
  const { usuario, esAdmin } = useSesion()
  const [eventos, setEventos] = useState<EventoHistorial[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todo')

  useEffect(() => {
    api
      .listarHistorial()
      .then(({ eventos: lista }) => setEventos(lista))
      .catch((e) => setError((e as Error).message))
  }, [])

  const visibles = useMemo(() => {
    if (!eventos) return []
    if (filtro === 'exportacion') return eventos.filter((e) => e.tipo === 'exportacion')
    if (filtro === 'creacion') return eventos.filter((e) => e.tipo.startsWith('proyecto') || e.tipo === 'search_generado')
    return eventos
  }, [eventos, filtro])

  return (
    <div className="seccion">
      <div className="seccion__cabecera">
        <div>
          <h2>Historial de trabajos</h2>
          <p style={{ color: 'var(--txt-suave)' }}>
            {esAdmin ? 'Actividad de todas las cuentas.' : 'Tu actividad en el aplicativo.'} Incluye horario de creación
            y de exportación.
          </p>
        </div>
      </div>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <div className="panel seccion">
        <Tabs
          etiqueta="Filtrar historial"
          valor={filtro}
          onCambio={setFiltro}
          opciones={[
            { id: 'todo', nombre: 'Todo' },
            { id: 'creacion', nombre: 'Campañas' },
            { id: 'exportacion', nombre: 'Exportaciones' },
          ]}
        />

        {!eventos ? (
          <Cargando texto="Cargando historial…" />
        ) : visibles.length === 0 ? (
          <EstadoVacio
            titulo="Sin movimientos registrados"
            descripcion="Cuando crees campañas, generes anuncios o exportes banners, el registro aparecerá aquí con su fecha y hora."
          />
        ) : (
          <div className="tabla-scroll">
            <table className="tabla">
              <caption className="visually-hidden">Historial de trabajos</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha y hora</th>
                  <th scope="col">Acción</th>
                  <th scope="col">Detalle</th>
                  <th scope="col">Campaña</th>
                  <th scope="col">Formato</th>
                  {esAdmin ? <th scope="col">Cuenta</th> : null}
                </tr>
              </thead>
              <tbody>
                {visibles.map((ev) => (
                  <tr key={ev.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fecha(ev.creadoEn, usuario?.zonaHoraria)}</td>
                    <td>
                      <span className={`chip ${ev.tipo === 'exportacion' ? 'chip--exito' : 'chip--info'}`}>
                        {NOMBRES[ev.tipo] ?? ev.tipo}
                      </span>
                    </td>
                    <td>{ev.detalle}</td>
                    <td>{ev.proyectoNombre ?? '—'}</td>
                    <td>{ev.formato ?? '—'}</td>
                    {esAdmin ? <td>{ev.usuarioEmail}</td> : null}
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
