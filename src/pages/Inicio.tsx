import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Aviso, Boton, Cargando, EstadoVacio } from '../components/ui'
import { Icono } from '../components/Icono'
import { api } from '../lib/api'
import { useSesion } from '../lib/sesion'
import { alFallarFoto, FOTO_INICIO } from '../lib/recursos'
import type { Proyecto } from '../lib/types'
import { fecha } from '../lib/formato'

const CANALES = [
  {
    id: 'search' as const,
    nombre: 'Google Search',
    icono: 'buscar' as const,
    clase: 'canal--search',
    texto:
      'Char B lee la página de la promoción, entiende producto y competencia y propone títulos, descripciones, palabras clave por concordancia y negativas.',
  },
  {
    id: 'display' as const,
    nombre: 'Google Display',
    icono: 'display' as const,
    clase: 'canal--display',
    texto:
      'Diseña el banner de 300 × 250 con fondo, formas, textos y logo, y replícalo a los 14 formatos estándar de Display.',
  },
  {
    id: 'meta' as const,
    nombre: 'Meta',
    icono: 'meta' as const,
    clase: 'canal--meta',
    texto: 'Los mismos elementos adaptados a feed 1:1, 4:5, Stories 9:16, enlace 1.91:1 y carrusel.',
  },
]

export function Inicio() {
  const { usuario, esAdmin, estadoServicio } = useSesion()
  const navegar = useNavigate()
  const [proyectos, setProyectos] = useState<Proyecto[] | null>(null)
  const [conteos, setConteos] = useState({ marcas: 0, imagenes: 0 })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    async function cargar() {
      try {
        const [lista, marcas, biblioteca] = await Promise.all([
          api.listarProyectos(),
          api.listarMarcas(),
          api.listarImagenes(),
        ])
        if (!vivo) return
        setProyectos(lista.proyectos)
        setConteos({ marcas: marcas.length, imagenes: biblioteca.imagenes.length })
      } catch (e) {
        if (vivo) setError((e as Error).message)
      }
    }
    void cargar()
    return () => {
      vivo = false
    }
  }, [])

  const enCurso = proyectos?.filter((p) => p.estado === 'en_curso') ?? []
  const realizados = proyectos?.filter((p) => p.estado === 'realizado') ?? []

  return (
    <div className="seccion" style={{ gap: 'var(--e4)' }}>
      <section className="inicio__portada">
        <div className="inicio__portada-texto">
          <span className="chip chip--marca" style={{ alignSelf: 'flex-start' }}>
            Hola, {usuario?.nombre.split(' ')[0]}
          </span>
          <h2>Arma la campaña completa desde un solo lugar</h2>
          <p style={{ maxWidth: '52ch' }}>
            Elige las plataformas, deja que Char B resuelva los anuncios de búsqueda y produce todos los banners a partir
            del lienzo base de 300 × 250.
          </p>
          <div className="inicio__acciones">
            <Boton variante="sobre-azul" icono="mas" onClick={() => navegar('/campanas/nueva')}>
              Crear campaña
            </Boton>
            <Boton variante="secundario" icono="proyectos" onClick={() => navegar('/proyectos')}>
              Proyectos en curso
            </Boton>
          </div>
        </div>
        <div className="inicio__portada-figura">
          <img src={FOTO_INICIO.rutaLocal} onError={alFallarFoto(FOTO_INICIO)} alt={FOTO_INICIO.alt} />
        </div>
      </section>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      {estadoServicio && !estadoServicio.ia.configurada ? (
        <Aviso tipo="alerta" titulo="Char B todavía no está conectada">
          Falta la variable <strong>GEMINI_API_KEY</strong> en Cloudflare. El editor de Display y Meta funciona igual; los
          anuncios de Search no se pueden generar hasta configurarla.
        </Aviso>
      ) : null}

      <section className="metricas">
        <div className="metrica">
          <span className="metrica__valor">{proyectos ? enCurso.length : '—'}</span>
          <span className="metrica__etiqueta">Campañas en curso</span>
        </div>
        <div className="metrica">
          <span className="metrica__valor">{proyectos ? realizados.length : '—'}</span>
          <span className="metrica__etiqueta">Campañas realizadas</span>
        </div>
        <div className="metrica">
          <span className="metrica__valor">{conteos.marcas || '—'}</span>
          <span className="metrica__etiqueta">Marcas disponibles</span>
        </div>
        <div className="metrica">
          <span className="metrica__valor">{conteos.imagenes || '—'}</span>
          <span className="metrica__etiqueta">Imágenes en biblioteca</span>
        </div>
      </section>

      <section className="seccion">
        <h2>Qué resuelve cada plataforma</h2>
        <div className="inicio__canales">
          {CANALES.map((c) => (
            <article key={c.id} className={`canal ${c.clase}`}>
              <span className="canal__icono">
                <Icono nombre={c.icono} tamano={22} />
              </span>
              <h3>{c.nombre}</h3>
              <p style={{ color: 'var(--txt-suave)', fontSize: 'var(--t-sm)' }}>{c.texto}</p>
              <Boton
                variante="terciario"
                onClick={() => navegar(`/campanas/nueva?canal=${c.id}`)}
                style={{ alignSelf: 'flex-start' }}
              >
                Crear campaña de {c.nombre}
              </Boton>
            </article>
          ))}
        </div>
      </section>

      <section className="panel seccion">
        <div className="seccion__cabecera">
          <h2>Últimos movimientos</h2>
          <Link to="/proyectos">Ver todos los proyectos</Link>
        </div>

        {!proyectos ? (
          <Cargando texto="Cargando tus campañas…" />
        ) : proyectos.length === 0 ? (
          <EstadoVacio
            titulo="Todavía no hay campañas"
            descripcion="Crea la primera campaña, elige las plataformas y empieza por el lienzo base de 300 × 250 o por el briefing de Search."
            accion={
              <Boton icono="mas" onClick={() => navegar('/campanas/nueva')}>
                Crear campaña
              </Boton>
            }
          />
        ) : (
          <div className="tabla-scroll">
            <table className="tabla">
              <caption className="visually-hidden">Campañas ordenadas por última actualización</caption>
              <thead>
                <tr>
                  <th scope="col">Campaña</th>
                  <th scope="col">Plataformas</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Actualizada</th>
                  {esAdmin ? <th scope="col">Responsable</th> : null}
                  <th scope="col"><span className="visually-hidden">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {proyectos.slice(0, 6).map((p) => (
                  <tr key={p.id}>
                    <th scope="row" style={{ fontWeight: 500, color: 'var(--txt-principal)' }}>{p.nombre}</th>
                    <td>{p.canales.join(' · ')}</td>
                    <td>
                      <span className={`chip ${p.estado === 'realizado' ? 'chip--exito' : 'chip--info'}`}>
                        {p.estado === 'realizado' ? 'Realizada' : 'En curso'}
                      </span>
                    </td>
                    <td>{fecha(p.actualizadoEn, usuario?.zonaHoraria)}</td>
                    {esAdmin ? <td>{(p as Proyecto & { propietarioEmail?: string }).propietarioEmail ?? '—'}</td> : null}
                    <td style={{ textAlign: 'right' }}>
                      <Link to={p.canales.includes('search') ? `/campanas/${p.id}/search` : `/campanas/${p.id}/editor`}>
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
