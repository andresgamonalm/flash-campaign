import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Aviso, Boton, Campo, Cargando, EstadoVacio, Tabs, useAvisar } from '../components/ui'
import { Icono } from '../components/Icono'
import { SelloCharB } from '../components/SelloCharB'
import { api, ErrorApi } from '../lib/api'
import { useSesion } from '../lib/sesion'
import { fecha } from '../lib/formato'
import { descargar } from '../lib/exportar'
import type { BriefSearch, Marca, Proyecto, ResultadoSearch } from '../lib/types'

const TIPOS_ANUNCIO = [
  'Anuncios de búsqueda responsivos (RSA)',
  'Campaña de marca',
  'Campaña de competencia',
  'Promoción por tiempo limitado',
  'Remarketing en búsqueda (RLSA)',
  'Captación de cotizaciones',
]

const LIMITES = { titulo: 30, descripcion: 90, ruta: 15 }

function Contador({ texto, limite }: { texto: string; limite: number }) {
  const excede = texto.length > limite
  return (
    <span className={`contador${excede ? ' contador--excede' : ''}`}>
      {texto.length}/{limite}
    </span>
  )
}

function ListaCopiable({
  titulo,
  items,
  limite,
}: {
  titulo: string
  items: string[]
  limite?: number
}) {
  const avisar = useAvisar()
  if (!items.length) return null
  return (
    <div className="bloque-resultado">
      <div className="bloque-resultado__cabecera">
        <h4>
          {titulo} <span className="chip">{items.length}</span>
        </h4>
        <Boton
          variante="terciario"
          pequeno
          icono="copiar"
          onClick={async () => {
            await navigator.clipboard.writeText(items.join('\n'))
            avisar(`${titulo} copiado al portapapeles.`, 'exito')
          }}
        >
          Copiar
        </Boton>
      </div>
      <ol className="lista-resultado">
        {items.map((item, i) => (
          <li key={`${item}-${i}`}>
            <span>{item}</span>
            {limite ? <Contador texto={item} limite={limite} /> : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

export function CreadorSearch() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const avisar = useAvisar()
  const { usuario, estadoServicio } = useSesion()

  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [brief, setBrief] = useState<BriefSearch | null>(null)
  const [resultado, setResultado] = useState<ResultadoSearch | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [grupoActivo, setGrupoActivo] = useState(0)

  const cargar = useCallback(async () => {
    if (!id) return
    try {
      const [{ proyecto: p }, listaMarcas] = await Promise.all([api.obtenerProyecto(id), api.listarMarcas()])
      setProyecto(p)
      setMarcas(listaMarcas)
      setBrief(
        p.brief ?? {
          tiposAnuncio: [],
          accionCta: '',
          ganchoOferta: '',
          destinoCta: '',
          urlReferencia1: '',
          urlReferencia2: '',
          imagenes: [],
          indicaciones: '',
        },
      )
      setResultado(p.resultadoSearch ?? null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [id])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const marca = useMemo(() => marcas.find((m) => m.id === proyecto?.marcaId) ?? null, [marcas, proyecto])

  function actualizar<K extends keyof BriefSearch>(clave: K, valor: BriefSearch[K]) {
    setBrief((previo) => (previo ? { ...previo, [clave]: valor } : previo))
  }

  async function guardarBrief(silencioso = false) {
    if (!proyecto || !brief) return
    setGuardando(true)
    try {
      const { proyecto: actualizado } = await api.guardarProyecto({ ...proyecto, brief, resultadoSearch: resultado ?? undefined })
      setProyecto(actualizado)
      if (!silencioso) avisar('Briefing guardado.', 'exito')
    } catch (e) {
      avisar((e as Error).message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function generar() {
    if (!proyecto || !brief) return
    setError(null)

    if (!brief.ganchoOferta.trim()) {
      setError('Escribe el gancho u oferta comercial: es lo que Char B necesita para redactar.')
      return
    }
    if (!brief.destinoCta.trim()) {
      setError('Indica el destino del CTA. Char B lee esa página para entender el producto.')
      return
    }

    setGenerando(true)
    try {
      const { resultado: salida } = await api.generarSearch({
        ...brief,
        nombreCampana: proyecto.nombre,
        marca: marca?.nombre ?? 'Estilo libre',
      })
      setResultado(salida)
      setGrupoActivo(0)
      await api.guardarProyecto({ ...proyecto, brief, resultadoSearch: salida })
      avisar('Char B generó la propuesta de campaña.', 'exito')
    } catch (e) {
      setError(
        e instanceof ErrorApi && e.status === 503
          ? 'Char B no está conectada: falta la variable GEMINI_API_KEY en Cloudflare.'
          : (e as Error).message,
      )
    } finally {
      setGenerando(false)
    }
  }

  function exportarCsv() {
    if (!resultado || !proyecto) return
    const filas: string[][] = [['Grupo de anuncios', 'Tipo', 'Contenido', 'Caracteres']]
    for (const grupo of resultado.grupos) {
      grupo.titulos.forEach((t) => filas.push([grupo.nombre, 'Título', t, String(t.length)]))
      grupo.descripciones.forEach((d) => filas.push([grupo.nombre, 'Descripción', d, String(d.length)]))
      grupo.rutas.forEach((r) => filas.push([grupo.nombre, 'Ruta', r, String(r.length)]))
      grupo.palabrasClave.amplia.forEach((k) => filas.push([grupo.nombre, 'Palabra clave amplia', k, '']))
      grupo.palabrasClave.frase.forEach((k) => filas.push([grupo.nombre, 'Palabra clave de frase', k, '']))
      grupo.palabrasClave.exacta.forEach((k) => filas.push([grupo.nombre, 'Palabra clave exacta', k, '']))
    }
    resultado.palabrasNegativas.forEach((n) => filas.push(['Campaña', 'Palabra negativa', n, '']))
    resultado.extensiones.textosDestacados.forEach((t) => filas.push(['Campaña', 'Texto destacado', t, String(t.length)]))
    resultado.extensiones.sitelinks.forEach((s) =>
      filas.push(['Campaña', 'Sitelink', `${s.titulo} | ${s.descripcion1} | ${s.descripcion2} | ${s.url}`, '']),
    )

    const csv = filas
      .map((fila) => fila.map((celda) => `"${celda.replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    descargar(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }), `search_${proyecto.nombre.replace(/\s+/g, '_').toLowerCase()}.csv`)
    void api.registrarEvento({
      tipo: 'exportacion',
      detalle: 'Exportó los anuncios de Search en CSV',
      proyectoId: proyecto.id,
      proyectoNombre: proyecto.nombre,
      formato: 'CSV',
    })
  }

  if (error && !proyecto) return <Aviso tipo="error">{error}</Aviso>
  if (!proyecto || !brief) return <Cargando texto="Abriendo la campaña…" />

  const grupo = resultado?.grupos[grupoActivo]

  return (
    <div className="seccion">
      <div className="seccion__cabecera">
        <div className="cabecera-char-b">
          {/* Sello de Char B: identifica de un vistazo la sección que opera con
              el asistente, frente a las que son puramente manuales. */}
          <SelloCharB />
          <div>
            <p className="migas">
              <Link to="/proyectos">Proyectos</Link> <Icono nombre="derecha" tamano={14} /> {proyecto.nombre}
            </p>
            <h2>Anuncios de Google Search</h2>
            <p style={{ color: 'var(--txt-suave)' }}>
              Char B lee las páginas que le entregues, razona el producto y la competencia y propone la campaña completa.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--e2)', flexWrap: 'wrap' }}>
          {proyecto.canales.some((c) => c !== 'search') ? (
            <Boton variante="secundario" icono="display" onClick={() => navegar(`/campanas/${proyecto.id}/editor`)}>
              Ir al editor de banners
            </Boton>
          ) : null}
          <Boton variante="secundario" icono="guardar" cargando={guardando} onClick={() => guardarBrief()}>
            Guardar briefing
          </Boton>
        </div>
      </div>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      {estadoServicio && !estadoServicio.ia.configurada ? (
        <Aviso tipo="alerta" titulo="Char B no está conectada">
          Configura la variable <strong>GEMINI_API_KEY</strong> en Cloudflare para habilitar la generación. El briefing se
          guarda igual.
        </Aviso>
      ) : null}

      <div className="search-layout">
        <form
          className="panel seccion"
          onSubmit={(e) => {
            e.preventDefault()
            void generar()
          }}
        >
          <h3>Briefing para Char B</h3>

          <fieldset className="grupo-campos">
            <legend className="campo__label">¿Qué tipo de anuncios de Search se necesitan?</legend>
            <div className="opciones">
              {TIPOS_ANUNCIO.map((tipo) => (
                <label key={tipo} className="check">
                  <input
                    type="checkbox"
                    checked={brief.tiposAnuncio.includes(tipo)}
                    onChange={(e) =>
                      actualizar(
                        'tiposAnuncio',
                        e.target.checked
                          ? [...brief.tiposAnuncio, tipo]
                          : brief.tiposAnuncio.filter((t) => t !== tipo),
                      )
                    }
                  />
                  {tipo}
                </label>
              ))}
            </div>
          </fieldset>

          <Campo etiqueta="Acción (el CTA)" ayuda="El verbo que debe aparecer en los anuncios. Por ejemplo: Cotiza online.">
            {(props) => (
              <input
                {...props}
                className="input"
                value={brief.accionCta}
                onChange={(e) => actualizar('accionCta', e.target.value)}
                maxLength={60}
              />
            )}
          </Campo>

          <Campo
            etiqueta="Gancho u oferta comercial"
            requerido
            ayuda="La promoción concreta: descuento, cuotas gratis, precio desde, regalo, plazo."
          >
            {(props) => (
              <textarea
                {...props}
                className="textarea"
                value={brief.ganchoOferta}
                onChange={(e) => actualizar('ganchoOferta', e.target.value)}
                rows={3}
              />
            )}
          </Campo>

          <Campo etiqueta="Destino del CTA" requerido ayuda="La URL a la que lleva el botón. Char B la lee para entender el producto.">
            {(props) => (
              <input
                {...props}
                className="input"
                type="url"
                inputMode="url"
                placeholder="https://"
                value={brief.destinoCta}
                onChange={(e) => actualizar('destinoCta', e.target.value)}
              />
            )}
          </Campo>

          <div className="rejilla rejilla--2">
            <Campo etiqueta="URL de referencia 1" ayuda="Opcional. Otra página que ayude a entender la promoción.">
              {(props) => (
                <input
                  {...props}
                  className="input"
                  type="url"
                  placeholder="https://"
                  value={brief.urlReferencia1}
                  onChange={(e) => actualizar('urlReferencia1', e.target.value)}
                />
              )}
            </Campo>
            <Campo etiqueta="URL de referencia 2" ayuda="Opcional.">
              {(props) => (
                <input
                  {...props}
                  className="input"
                  type="url"
                  placeholder="https://"
                  value={brief.urlReferencia2}
                  onChange={(e) => actualizar('urlReferencia2', e.target.value)}
                />
              )}
            </Campo>
          </div>

          <Campo
            etiqueta="Indicaciones generales"
            ayuda="Opcional. Detalles, restricciones legales, tono, palabras prohibidas o lo que quieras pedirle a Char B."
          >
            {(props) => (
              <textarea
                {...props}
                className="textarea"
                rows={4}
                value={brief.indicaciones}
                onChange={(e) => actualizar('indicaciones', e.target.value)}
              />
            )}
          </Campo>

          <Boton type="submit" icono="ia" cargando={generando} bloque>
            {generando ? 'Char B está analizando…' : 'Generar propuesta con Char B'}
          </Boton>
        </form>

        <div className="seccion">
          {!resultado ? (
            <div className="panel">
              <EstadoVacio
                titulo="Aún no hay propuesta"
                descripcion="Completa el gancho comercial y el destino del CTA, y pulsa “Generar propuesta con Char B”. Leerá las páginas indicadas antes de escribir."
              />
            </div>
          ) : (
            <>
              <div className="panel seccion">
                <div className="seccion__cabecera">
                  <div>
                    <h3>Lectura y diagnóstico</h3>
                    <p style={{ fontSize: 'var(--t-xs)', color: 'var(--txt-suave)' }}>
                      Generado el {fecha(resultado.generadoEn, usuario?.zonaHoraria)} con {resultado.modelo}
                    </p>
                  </div>
                  <Boton variante="secundario" icono="exportar" pequeno onClick={exportarCsv}>
                    Exportar CSV
                  </Boton>
                </div>

                <dl className="ficha">
                  <div>
                    <dt>Producto</dt>
                    <dd>{resultado.resumen.producto}</dd>
                  </div>
                  <div>
                    <dt>Propuesta de valor</dt>
                    <dd>{resultado.resumen.propuestaValor}</dd>
                  </div>
                  <div>
                    <dt>Público</dt>
                    <dd>{resultado.resumen.publico}</dd>
                  </div>
                  <div>
                    <dt>Competencia detectada</dt>
                    <dd>{resultado.resumen.competencia.join(', ') || '—'}</dd>
                  </div>
                </dl>

                <div className="fuentes">
                  {resultado.fuentesLeidas.map((f) => (
                    <span key={f.url} className={`chip ${f.estado === 'leída' ? 'chip--exito' : 'chip--alerta'}`}>
                      {f.estado === 'leída' ? 'Leída' : 'No leída'}: {f.url}
                    </span>
                  ))}
                </div>
              </div>

              {resultado.grupos.length > 1 ? (
                <Tabs
                  etiqueta="Grupos de anuncios"
                  valor={String(grupoActivo)}
                  onCambio={(v) => setGrupoActivo(Number(v))}
                  opciones={resultado.grupos.map((g, i) => ({ id: String(i), nombre: g.nombre }))}
                />
              ) : null}

              {grupo ? (
                <div className="panel seccion">
                  <div>
                    <h3>{grupo.nombre}</h3>
                    <p style={{ color: 'var(--txt-suave)', fontSize: 'var(--t-sm)' }}>{grupo.tema}</p>
                  </div>

                  <ListaCopiable titulo="Títulos" items={grupo.titulos} limite={LIMITES.titulo} />
                  <ListaCopiable titulo="Descripciones" items={grupo.descripciones} limite={LIMITES.descripcion} />
                  <ListaCopiable titulo="Rutas de visualización" items={grupo.rutas} limite={LIMITES.ruta} />
                  <ListaCopiable titulo="Palabras clave · concordancia amplia" items={grupo.palabrasClave.amplia} />
                  <ListaCopiable titulo="Palabras clave · concordancia de frase" items={grupo.palabrasClave.frase} />
                  <ListaCopiable titulo="Palabras clave · concordancia exacta" items={grupo.palabrasClave.exacta} />
                </div>
              ) : null}

              <div className="panel seccion">
                <ListaCopiable titulo="Palabras clave negativas" items={resultado.palabrasNegativas} />
                <ListaCopiable titulo="Textos destacados" items={resultado.extensiones.textosDestacados} limite={25} />

                {resultado.extensiones.sitelinks.length ? (
                  <div className="bloque-resultado">
                    <div className="bloque-resultado__cabecera">
                      <h4>Sitelinks <span className="chip">{resultado.extensiones.sitelinks.length}</span></h4>
                    </div>
                    <div className="tabla-scroll">
                      <table className="tabla">
                        <thead>
                          <tr>
                            <th scope="col">Título</th>
                            <th scope="col">Descripción 1</th>
                            <th scope="col">Descripción 2</th>
                            <th scope="col">URL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultado.extensiones.sitelinks.map((s, i) => (
                            <tr key={`${s.titulo}-${i}`}>
                              <td>{s.titulo}</td>
                              <td>{s.descripcion1}</td>
                              <td>{s.descripcion2}</td>
                              <td style={{ wordBreak: 'break-all' }}>{s.url}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {resultado.extensiones.fragmentos.length ? (
                  <div className="bloque-resultado">
                    <div className="bloque-resultado__cabecera">
                      <h4>Fragmentos estructurados</h4>
                    </div>
                    <ul className="lista-resultado">
                      {resultado.extensiones.fragmentos.map((f) => (
                        <li key={f.encabezado}>
                          <span>
                            <strong>{f.encabezado}:</strong> {f.valores.join(', ')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <ListaCopiable titulo="Recomendaciones de Char B" items={resultado.recomendaciones} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
