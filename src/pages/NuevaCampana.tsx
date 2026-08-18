import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Aviso, Boton, Campo, Cargando, useAvisar } from '../components/ui'
import { Icono } from '../components/Icono'
import { api } from '../lib/api'
import type { Canal, Marca } from '../lib/types'
import { disenoInicial } from '../lib/diseno'
import { formatosDeCanales } from '../lib/formatos'

const CANALES: { id: Canal; nombre: string; detalle: string; icono: 'buscar' | 'display' | 'meta' }[] = [
  { id: 'search', nombre: 'Google Search', detalle: 'Anuncios de texto con el asistente Char B', icono: 'buscar' },
  { id: 'display', nombre: 'Google Display', detalle: '14 formatos de banner replicados', icono: 'display' },
  { id: 'meta', nombre: 'Meta', detalle: '5 formatos de Facebook e Instagram', icono: 'meta' },
]

export function NuevaCampana() {
  const navegar = useNavigate()
  const avisar = useAvisar()
  const [parametros] = useSearchParams()

  const canalInicial = parametros.get('canal') as Canal | null
  const [nombre, setNombre] = useState('')
  const [canales, setCanales] = useState<Canal[]>(canalInicial ? [canalInicial] : ['search', 'display', 'meta'])
  const [marcas, setMarcas] = useState<Marca[] | null>(null)
  const [marcaId, setMarcaId] = useState<string>('marca_zurich')
  const [estiloLibre, setEstiloLibre] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    api
      .listarMarcas()
      .then((lista) => {
        setMarcas(lista)
        if (!lista.some((m) => m.id === 'marca_zurich') && lista[0]) setMarcaId(lista[0].id)
      })
      .catch((e) => setError((e as Error).message))
  }, [])

  const marca = useMemo(() => marcas?.find((m) => m.id === marcaId) ?? null, [marcas, marcaId])
  const formatos = useMemo(() => formatosDeCanales(canales.filter((c) => c !== 'search')), [canales])
  const necesitaEditor = canales.includes('display') || canales.includes('meta')

  function alternar(canal: Canal) {
    setCanales((previos) =>
      previos.includes(canal) ? previos.filter((c) => c !== canal) : [...previos, canal],
    )
  }

  async function crear(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)

    if (!nombre.trim()) {
      setError('Ponle un nombre a la campaña para poder reconocerla después.')
      return
    }
    if (!canales.length) {
      setError('Elige al menos una plataforma.')
      return
    }

    setGuardando(true)
    try {
      const { proyecto } = await api.guardarProyecto({
        nombre: nombre.trim(),
        canales,
        estado: 'en_curso',
        marcaId: estiloLibre ? null : marcaId,
        diseno: necesitaEditor
          ? disenoInicial(
              canales.filter((c) => c !== 'search'),
              estiloLibre ? null : marca,
              estiloLibre,
            )
          : undefined,
        brief: canales.includes('search')
          ? {
              tiposAnuncio: [],
              accionCta: '',
              ganchoOferta: '',
              destinoCta: '',
              urlReferencia1: '',
              urlReferencia2: '',
              imagenes: [],
              indicaciones: '',
            }
          : undefined,
      })
      avisar('Campaña creada. Ya puedes trabajarla.', 'exito')
      navegar(canales.includes('search') ? `/campanas/${proyecto.id}/search` : `/campanas/${proyecto.id}/editor`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="seccion" style={{ maxWidth: 940 }} onSubmit={crear} noValidate>
      <div className="seccion__cabecera">
        <div>
          <h2>Crear campaña</h2>
          <p style={{ color: 'var(--txt-suave)' }}>
            Elige las plataformas y la marca. Puedes seleccionar las tres, dos o sólo una.
          </p>
        </div>
      </div>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <section className="panel seccion">
        <Campo etiqueta="Nombre de la campaña" requerido ayuda="Por ejemplo: Auto Digital · 2 cuotas gratis · agosto">
          {(props) => (
            <input
              {...props}
              className="input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={80}
              autoFocus
            />
          )}
        </Campo>
      </section>

      <section className="panel seccion">
        <h3>Plataformas</h3>
        <div className="rejilla rejilla--3">
          {CANALES.map((c) => {
            const activo = canales.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                className={`tarjeta-seleccion${activo ? ' tarjeta-seleccion--activa' : ''}`}
                onClick={() => alternar(c.id)}
                aria-pressed={activo}
              >
                <span className="tarjeta-seleccion__icono">
                  <Icono nombre={c.icono} tamano={22} />
                </span>
                <span className="tarjeta-seleccion__titulo">{c.nombre}</span>
                <span className="tarjeta-seleccion__detalle">{c.detalle}</span>
                <span className={`chip ${activo ? 'chip--exito' : ''}`}>{activo ? 'Incluida' : 'No incluida'}</span>
              </button>
            )
          })}
        </div>
        {necesitaEditor ? (
          <p style={{ fontSize: 'var(--t-sm)', color: 'var(--txt-suave)' }}>
            Se crearán {formatos.length} lienzos en blanco. El de 300 × 250 es el punto de partida y desde ahí se replica
            el resto.
          </p>
        ) : null}
      </section>

      <section className="panel seccion">
        <h3>Marca</h3>
        {!marcas ? (
          <Cargando texto="Cargando marcas…" />
        ) : (
          <>
            <Campo etiqueta="Marca de la campaña">
              {(props) => (
                <select
                  {...props}
                  className="select"
                  value={estiloLibre ? 'libre' : marcaId}
                  onChange={(e) => {
                    if (e.target.value === 'libre') {
                      setEstiloLibre(true)
                    } else {
                      setEstiloLibre(false)
                      setMarcaId(e.target.value)
                    }
                  }}
                >
                  {marcas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                      {m.esSistema ? ' (predeterminada)' : ''}
                    </option>
                  ))}
                  <option value="libre">Estilo libre (sin marca)</option>
                </select>
              )}
            </Campo>

            {!estiloLibre && marca ? (
              <div className="marca-vista">
                <div className="marca-vista__colores">
                  {marca.colores.map((c) => (
                    <span key={c} style={{ background: c }} title={c} />
                  ))}
                </div>
                <p style={{ fontSize: 'var(--t-sm)', color: 'var(--txt-suave)' }}>
                  {marca.logos.length} logotipo(s) · tipografía {marca.tipografia.titulo}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 'var(--t-sm)', color: 'var(--txt-suave)' }}>
                En estilo libre eliges cualquier color y tipografía desde el editor, sin restricciones de marca.
              </p>
            )}

            <p style={{ fontSize: 'var(--t-sm)' }}>
              ¿Falta una marca? <Link to="/marcas">Créala en la sección Marcas</Link>.
            </p>
          </>
        )}
      </section>

      <div style={{ display: 'flex', gap: 'var(--e2)', flexWrap: 'wrap' }}>
        <Boton type="submit" cargando={guardando} icono="mas">
          Crear campaña
        </Boton>
        <Boton variante="secundario" onClick={() => navegar(-1)}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}
