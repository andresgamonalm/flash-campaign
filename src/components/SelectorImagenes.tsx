import { useCallback, useEffect, useRef, useState } from 'react'
import { Aviso, Boton, Cargando, EstadoVacio, Modal, useAvisar } from '../components/ui'
import { api, medirArchivo } from '../lib/api'
import { peso } from '../lib/formato'
import type { ImagenBiblioteca } from '../lib/types'

interface Props {
  titulo?: string
  onElegir: (imagen: ImagenBiblioteca) => void
  onCerrar: () => void
  multiple?: boolean
}

/** Biblioteca compartida: elegir una imagen existente o subir una nueva. */
export function SelectorImagenes({ titulo = 'Biblioteca de imágenes', onElegir, onCerrar, multiple = false }: Props) {
  const avisar = useAvisar()
  const [imagenes, setImagenes] = useState<ImagenBiblioteca[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [busqueda, setBusqueda] = useState('')
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
    try {
      for (const archivo of Array.from(archivos)) {
        const medidas = await medirArchivo(archivo)
        await api.subirImagen(archivo, medidas)
      }
      avisar(archivos.length > 1 ? 'Imágenes subidas.' : 'Imagen subida.', 'exito')
      await cargar()
    } catch (e) {
      avisar((e as Error).message, 'error')
    } finally {
      setSubiendo(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  const filtradas = (imagenes ?? []).filter((i) => {
    const texto = busqueda.trim().toLowerCase()
    return !texto || i.nombre.toLowerCase().includes(texto) || i.etiquetas.some((t) => t.includes(texto))
  })

  return (
    <Modal titulo={titulo} onCerrar={onCerrar} ancho descripcion="Elige una imagen del catálogo o sube una nueva desde tu equipo.">
      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <div style={{ display: 'flex', gap: 'var(--e2)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label className="campo" style={{ flex: '1 1 240px' }}>
          <span className="campo__label">Buscar</span>
          <input
            className="input"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre o etiqueta"
          />
        </label>
        <input
          ref={entrada}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          multiple
          className="visually-hidden"
          id="selector-subida"
          aria-label="Seleccionar imágenes para subir a la biblioteca"
          onChange={(e) => subir(e.target.files)}
        />
        <Boton
          variante="secundario"
          icono="subir"
          cargando={subiendo}
          onClick={() => entrada.current?.click()}
        >
          Subir imagen
        </Boton>
      </div>

      {!imagenes ? (
        <Cargando texto="Cargando biblioteca…" />
      ) : filtradas.length === 0 ? (
        <EstadoVacio
          titulo="Sin imágenes"
          descripcion="Sube una imagen desde tu equipo para empezar tu biblioteca. Sólo tú verás tus archivos."
        />
      ) : (
        <ul className="galeria" role="list">
          {filtradas.map((img) => (
            <li key={img.id}>
              <button
                type="button"
                className="galeria__item"
                onClick={() => {
                  onElegir(img)
                  if (!multiple) onCerrar()
                }}
              >
                <img src={img.src} alt="" loading="lazy" width={img.ancho || undefined} height={img.alto || undefined} />
                <span className="galeria__nombre">{img.nombre}</span>
                <span className="galeria__meta">
                  {img.ancho && img.alto ? `${img.ancho}×${img.alto}` : 'Medidas no registradas'} · {peso(img.peso)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
