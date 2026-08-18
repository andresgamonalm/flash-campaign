import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Aviso, Boton, Cargando, EstadoVacio, Tabs, useAvisar, useConfirmacion } from '../components/ui'
import { Icono } from '../components/Icono'
import { api, medirArchivo } from '../lib/api'
import { useSesion } from '../lib/sesion'
import { fecha, peso } from '../lib/formato'
import type { ImagenBiblioteca } from '../lib/types'

type Filtro = 'todas' | 'usuario' | 'cloudflare' | 'proyecto'

const FILTROS: { id: Filtro; nombre: string }[] = [
  { id: 'todas', nombre: 'Todas' },
  { id: 'usuario', nombre: 'Mis imágenes' },
  { id: 'cloudflare', nombre: 'Catálogo Cloudflare' },
  { id: 'proyecto', nombre: 'Material del proyecto' },
]

export function Biblioteca() {
  const { usuario, esAdmin, estadoServicio } = useSesion()
  const avisar = useAvisar()
  const { confirmar, dialogo } = useConfirmacion()

  const [imagenes, setImagenes] = useState<ImagenBiblioteca[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)

  const cargar = useCallback(async () => {
    try {
      const { imagenes: lista } = await api.listarImagenes()
      setImagenes(lista)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function subir(archivos: FileList | null) {
    if (!archivos?.length) return
    setSubiendo(true)
    let correctas = 0
    try {
      for (const archivo of Array.from(archivos)) {
        const medidas = await medirArchivo(archivo)
        await api.subirImagen(archivo, medidas)
        correctas += 1
      }
      avisar(`${correctas} imagen(es) subida(s).`, 'exito')
      await cargar()
    } catch (e) {
      avisar((e as Error).message, 'error')
    } finally {
      setSubiendo(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  async function eliminar(imagen: ImagenBiblioteca) {
    const ok = await confirmar(
      'Eliminar imagen',
      `Se eliminará "${imagen.nombre}" de la biblioteca. Las campañas que la usen mostrarán un hueco.`,
      'Eliminar',
    )
    if (!ok) return
    try {
      await api.eliminarImagen(imagen.id)
      avisar('Imagen eliminada.', 'exito')
      await cargar()
    } catch (e) {
      avisar((e as Error).message, 'error')
    }
  }

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return (imagenes ?? [])
      .filter((i) => filtro === 'todas' || i.origen === filtro)
      .filter((i) => !texto || i.nombre.toLowerCase().includes(texto) || i.etiquetas.some((t) => t.includes(texto)))
  }, [imagenes, filtro, busqueda])

  return (
    <div className="seccion">
      {dialogo}

      <div className="seccion__cabecera">
        <div>
          <h2>Biblioteca de imágenes</h2>
          <p style={{ color: 'var(--txt-suave)' }}>
            {esAdmin
              ? 'Como administrador ves y usas todo el material cargado en el aplicativo.'
              : 'Ves el catálogo común y las imágenes que tú subes. Nadie más accede a tus archivos.'}
          </p>
        </div>
        <div>
          <input
            ref={entrada}
            id="subida-biblioteca"
            type="file"
            className="visually-hidden"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            multiple
            aria-label="Seleccionar imágenes para subir a la biblioteca"
            onChange={(e) => subir(e.target.files)}
          />
          <Boton icono="subir" cargando={subiendo} onClick={() => entrada.current?.click()}>
            Subir imágenes
          </Boton>
        </div>
      </div>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      {estadoServicio && estadoServicio.almacenamiento.imagenes === 'memoria' ? (
        <Aviso tipo="alerta" titulo="Las imágenes no se están guardando de forma permanente">
          Enlaza el bucket R2 <strong>MEDIA</strong> o el espacio KV <strong>FLASH_KV</strong> en Cloudflare para que las
          subidas sobrevivan a los reinicios.
        </Aviso>
      ) : null}

      <div className="panel seccion">
        <div className="seccion__cabecera">
          <Tabs etiqueta="Origen de las imágenes" valor={filtro} onCambio={setFiltro} opciones={FILTROS} />
          <label className="campo" style={{ minWidth: 240 }}>
            <span className="visually-hidden">Buscar imagen</span>
            <input
              className="input"
              type="search"
              placeholder="Buscar por nombre o etiqueta"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>
        </div>

        {!imagenes ? (
          <Cargando texto="Cargando biblioteca…" />
        ) : visibles.length === 0 ? (
          <EstadoVacio
            titulo="Sin imágenes en esta vista"
            descripcion="Sube tus fotos o cambia de pestaña para ver el catálogo común y el material que viaja con el proyecto."
            accion={
              <Boton icono="subir" onClick={() => entrada.current?.click()}>
                Subir imágenes
              </Boton>
            }
          />
        ) : (
          <ul className="galeria galeria--amplia" role="list">
            {visibles.map((img) => (
              <li key={img.id} className="galeria__ficha">
                <img src={img.src} alt={img.nombre} loading="lazy" />
                <div className="galeria__info">
                  <strong>{img.nombre}</strong>
                  <span>
                    {img.ancho && img.alto ? `${img.ancho}×${img.alto}` : 'Medidas no registradas'} · {peso(img.peso)}
                  </span>
                  <span className="chip">
                    {img.origen === 'usuario' ? 'Subida por un usuario' : img.origen === 'cloudflare' ? 'Catálogo Cloudflare' : 'Material del proyecto'}
                  </span>
                  <span style={{ fontSize: 'var(--t-xs)', color: 'var(--txt-suave)' }}>
                    {fecha(img.creadoEn, usuario?.zonaHoraria)}
                  </span>
                  {img.origen === 'usuario' ? (
                    <Boton variante="terciario" pequeno icono="basura" onClick={() => eliminar(img)}>
                      Eliminar
                    </Boton>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Aviso tipo="info" titulo="Cómo se conecta con Cloudflare">
        <p>
          El catálogo común se lee desde el bucket enlazado o desde el manifiesto que indique la variable{' '}
          <strong>MEDIA_MANIFEST_URL</strong>. Las imágenes que subes aquí se guardan en R2 (o en KV si R2 no está
          enlazado) y sólo tú las ves.
        </p>
        <p style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icono nombre="info" tamano={16} /> Formatos admitidos: JPG, PNG, WEBP, GIF y SVG, hasta 10 MB por archivo.
        </p>
      </Aviso>
    </div>
  )
}
