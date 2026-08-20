import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Aviso, Boton, Campo, Cargando, Modal, Tabs, useAvisar, useConfirmacion } from '../components/ui'
import { Icono } from '../components/Icono'
import { Lienzo } from '../components/Lienzo'
import { Inspector } from '../components/Inspector'
import { SelectorImagenes } from '../components/SelectorImagenes'
import { MiniaturaBanner } from '../components/MiniaturaBanner'
import { api } from '../lib/api'
import { PALETA_LIBRE } from '../lib/marcas'
import { buscarFormato, etiquetaFormato } from '../lib/formatos'
import { descripcionModo, modoPara } from '../lib/replicar'
import {
  bannerBase,
  crearCirculo,
  crearCta,
  crearCuadrado,
  crearImagen,
  crearLogo,
  crearRectangulo,
  crearTexto,
  duplicarElemento,
  replicarDiseno,
} from '../lib/diseno'
import { descargar, exportarBanners } from '../lib/exportar'
import { useDeshacer } from '../lib/historialEdicion'
import type { Banner, DisenoProyecto, Elemento, Marca, Proyecto } from '../lib/types'

type DestinoImagen = 'fondo' | 'elemento' | 'nuevo-elemento' | 'logo'

export function Editor() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const avisar = useAvisar()
  const { confirmar, dialogo } = useConfirmacion()

  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [marca, setMarca] = useState<Marca | null>(null)
  const [diseno, setDiseno] = useState<DisenoProyecto | null>(null)
  const [indice, setIndice] = useState(0)
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [cambiosSinGuardar, setCambiosSinGuardar] = useState(false)
  const [selectorImagen, setSelectorImagen] = useState<DestinoImagen | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [panelMovil, setPanelMovil] = useState<'formatos' | 'lienzo' | 'propiedades'>('lienzo')
  const [opcionesExport, setOpcionesExport] = useState({ jpg: true, html: true, calidadJpg: 0.92, escalaJpg: 2 })
  const [modalExport, setModalExport] = useState(false)

  const contenedorLienzo = useRef<HTMLDivElement>(null)
  const pasos = useDeshacer<DisenoProyecto>()
  // Referencias vivas para el manejador de teclado, que se suscribe una vez.
  const pasosRef = useRef(pasos)
  pasosRef.current = pasos
  const aplicarPasoRef = useRef<(estado: DisenoProyecto | null) => void>(() => {})

  useEffect(() => {
    let vivo = true
    async function cargar() {
      if (!id) return
      try {
        const [{ proyecto: p }, marcas] = await Promise.all([api.obtenerProyecto(id), api.listarMarcas()])
        if (!vivo) return
        setProyecto(p)
        setMarca(marcas.find((m) => m.id === p.marcaId) ?? null)
        setDiseno(p.diseno ?? null)
        if (p.diseno) pasos.reiniciar(p.diseno)
      } catch (e) {
        if (vivo) setError((e as Error).message)
      }
    }
    void cargar()
    return () => {
      vivo = false
    }
  }, [id])

  const banner = diseno?.banners[indice] ?? null
  const elemento = useMemo(
    () => banner?.elementos.find((el) => el.id === seleccionadoId) ?? null,
    [banner, seleccionadoId],
  )
  const paleta = marca ? [...marca.colores, ...PALETA_LIBRE.filter((c) => !marca.colores.includes(c))] : PALETA_LIBRE
  const esBase = Boolean(banner?.base)

  /** Ajusta el zoom para que el lienzo entre en el espacio disponible. */
  useEffect(() => {
    if (!banner) return
    function ajustar() {
      const ancho = contenedorLienzo.current?.clientWidth ?? 800
      const alto = Math.max(320, window.innerHeight - 320)
      const escala = Math.min((ancho - 48) / banner!.ancho, alto / banner!.alto, 2)
      setZoom(Math.max(0.12, Number(escala.toFixed(2))))
    }
    ajustar()
    window.addEventListener('resize', ajustar)
    return () => window.removeEventListener('resize', ajustar)
  }, [banner])

  // Se guarda en una referencia para que el manejador de teclado siempre borre
  // sobre el estado actual, sin tener que volver a suscribirse en cada cambio.
  const eliminarSeleccionadoRef = useRef<() => void>(() => {})

  /**
   * Atajos de teclado del lienzo.
   *
   * Suprimir o Retroceso borran el elemento seleccionado y Escape lo deselecciona,
   * que es lo que cualquiera intenta antes de buscar un botón. Se ignoran mientras
   * se escribe en un campo, para no borrar una forma al corregir un texto.
   */
  useEffect(() => {
    function alPulsar(evento: KeyboardEvent) {
      const foco = document.activeElement as HTMLElement | null
      const etiqueta = foco?.tagName
      const escribiendo =
        etiqueta === 'INPUT' || etiqueta === 'TEXTAREA' || etiqueta === 'SELECT' || Boolean(foco?.isContentEditable)

      // Deshacer y rehacer, con las combinaciones de siempre en Windows y en Mac.
      // Mientras se escribe en un campo mandan las del navegador, que deshacen el
      // texto: sería desconcertante que Ctrl+Z revirtiera el diseño entero.
      if ((evento.ctrlKey || evento.metaKey) && !escribiendo) {
        const tecla = evento.key.toLowerCase()
        if (tecla === 'z' && !evento.shiftKey) {
          evento.preventDefault()
          aplicarPasoRef.current(pasosRef.current.deshacer())
          return
        }
        if ((tecla === 'z' && evento.shiftKey) || tecla === 'y') {
          evento.preventDefault()
          aplicarPasoRef.current(pasosRef.current.rehacer())
          return
        }
      }

      if (evento.key !== 'Delete' && evento.key !== 'Backspace' && evento.key !== 'Escape') return
      if (escribiendo) return
      if (evento.key === 'Escape') {
        setSeleccionadoId(null)
        return
      }
      if (!seleccionadoId) return
      evento.preventDefault()
      eliminarSeleccionadoRef.current()
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [seleccionadoId])

  const actualizarBanner = useCallback(
    (cambios: Partial<Banner>, marcarManual = true) => {
      setDiseno((previo) => {
        if (!previo) return previo
        const banners = previo.banners.map((b, i) =>
          i === indice
            ? { ...b, ...cambios, ajustadoManualmente: b.base ? false : marcarManual || b.ajustadoManualmente }
            : b,
        )
        const siguiente = { ...previo, banners }
        pasos.registrar(siguiente)
        return siguiente
      })
      setCambiosSinGuardar(true)
    },
    [indice, pasos],
  )

  const cambiarElemento = useCallback(
    (actualizado: Elemento) => {
      setDiseno((previo) => {
        if (!previo) return previo
        const banners = previo.banners.map((b, i) => {
          if (i !== indice) return b
          return {
            ...b,
            ajustadoManualmente: b.base ? false : true,
            elementos: b.elementos.map((el) => (el.id === actualizado.id ? actualizado : el)),
          }
        })
        return { ...previo, banners }
      })
      setCambiosSinGuardar(true)
    },
    [indice],
  )

  /**
   * Un arrastre son cientos de cambios seguidos; registrar cada uno llenaría el
   * historial de pasos de un píxel. Se registra al soltar, que es cuando el
   * usuario da la acción por terminada.
   */
  const cerrarGesto = useCallback(() => {
    setDiseno((previo) => {
      if (previo) pasos.registrar(previo)
      return previo
    })
  }, [pasos])

  const aplicarPaso = useCallback(
    (estado: DisenoProyecto | null) => {
      if (!estado) return
      setDiseno(estado)
      setCambiosSinGuardar(true)
      setSeleccionadoId(null)
    },
    [],
  )
  aplicarPasoRef.current = aplicarPaso

  function anadirElemento(nuevos: Elemento | Elemento[]) {
    if (!banner) return
    const lista = Array.isArray(nuevos) ? nuevos : [nuevos]
    actualizarBanner({ elementos: [...banner.elementos, ...lista] })
    setSeleccionadoId(lista[lista.length - 1].id)
  }

  function eliminarSeleccionado() {
    if (!banner || !elemento) return
    actualizarBanner({ elementos: banner.elementos.filter((el) => el.id !== elemento.id) })
    setSeleccionadoId(null)
  }
  eliminarSeleccionadoRef.current = eliminarSeleccionado

  function ordenar(direccion: 'adelante' | 'atras' | 'frente' | 'fondo') {
    if (!banner || !elemento) return
    const zs = banner.elementos.map((el) => el.z)
    const max = Math.max(...zs)
    const min = Math.min(...zs)
    const nuevoZ =
      direccion === 'frente'
        ? max + 1
        : direccion === 'fondo'
          ? min - 1
          : direccion === 'adelante'
            ? elemento.z + 1.5
            : elemento.z - 1.5
    cambiarElemento({ ...elemento, z: nuevoZ })
  }

  async function guardar(silencioso = false) {
    if (!proyecto || !diseno) return
    setGuardando(true)
    try {
      const { proyecto: actualizado } = await api.guardarProyecto({ ...proyecto, diseno })
      setProyecto(actualizado)
      setCambiosSinGuardar(false)
      if (!silencioso) {
        avisar('Cambios guardados.', 'exito')
        await api.registrarEvento({
          tipo: 'banner_guardado',
          detalle: `Guardó el diseño de ${diseno.banners.length} formatos`,
          proyectoId: proyecto.id,
          proyectoNombre: proyecto.nombre,
        })
      }
    } catch (e) {
      avisar((e as Error).message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function replicar() {
    if (!diseno || !proyecto) return
    const base = bannerBase(diseno)
    if (!base || base.elementos.length === 0) {
      avisar('Primero diseña el lienzo base de 300 × 250: la replicación parte de ahí.', 'alerta')
      return
    }

    const manuales = diseno.banners.filter((b) => !b.base && b.ajustadoManualmente).length
    let sobrescribir = false
    if (manuales > 0) {
      sobrescribir = await confirmar(
        'Volver a replicar',
        `${manuales} formato(s) tienen ajustes manuales. ¿Quieres sobrescribirlos también? Si eliges "Conservar", sólo se rehacen los formatos sin ajustes.`,
        'Sobrescribir todos',
      )
    }

    const { diseno: nuevo, replicados, conservados } = replicarDiseno(diseno, { sobrescribirManuales: sobrescribir })
    setDiseno(nuevo)
    setCambiosSinGuardar(true)
    avisar(
      conservados
        ? `${replicados} formatos replicados. Se conservaron ${conservados} con ajustes manuales.`
        : `${replicados} formatos replicados desde el lienzo base.`,
      'exito',
    )
    await api.registrarEvento({
      tipo: 'banners_replicados',
      detalle: `Replicó el lienzo base a ${replicados} formatos`,
      proyectoId: proyecto.id,
      proyectoNombre: proyecto.nombre,
    })
  }

  async function exportar() {
    if (!diseno || !proyecto) return
    const elegidos = diseno.banners.filter((b) => b.seleccionado)
    if (!elegidos.length) {
      avisar('Selecciona al menos un formato para exportar.', 'alerta')
      return
    }
    if (!opcionesExport.jpg && !opcionesExport.html) {
      avisar('Elige al menos un formato de salida: JPG o HTML.', 'alerta')
      return
    }

    setExportando(true)
    try {
      const { blob, nombre, archivos } = await exportarBanners(elegidos, proyecto.nombre, opcionesExport)
      descargar(blob, nombre)
      await api.registrarEvento({
        tipo: 'exportacion',
        detalle: `Exportó ${elegidos.length} pieza(s) · ${archivos.length} archivo(s)`,
        proyectoId: proyecto.id,
        proyectoNombre: proyecto.nombre,
        formato: [opcionesExport.jpg ? 'JPG' : null, opcionesExport.html ? 'HTML' : null].filter(Boolean).join(' + '),
      })
      avisar(`Exportación lista: ${archivos.length} archivo(s) en ${nombre}.`, 'exito')
      setModalExport(false)
    } catch (e) {
      avisar((e as Error).message, 'error')
    } finally {
      setExportando(false)
    }
  }

  function elegirImagen(src: string, nombre: string, medidas: { ancho: number; alto: number }, imagenId: string) {
    if (!banner) return
    switch (selectorImagen) {
      case 'fondo':
        actualizarBanner({ fondo: { ...banner.fondo, tipo: 'imagen', imagenSrc: src, imagenId } })
        break
      case 'logo':
        anadirElemento(crearLogo(banner, src, nombre))
        break
      case 'nuevo-elemento':
        anadirElemento(crearImagen(banner, src, nombre, medidas))
        break
      case 'elemento':
        if (elemento && (elemento.tipo === 'imagen' || elemento.tipo === 'logo')) {
          cambiarElemento({ ...elemento, src, nombre })
        }
        break
    }
    setSelectorImagen(null)
  }

  if (error && !proyecto) return <Aviso tipo="error">{error}</Aviso>
  if (!proyecto || !diseno || !banner) {
    return proyecto && !diseno ? (
      <Aviso tipo="alerta" titulo="Esta campaña no incluye piezas gráficas">
        Se creó sólo para Google Search. <Link to={`/campanas/${proyecto.id}/search`}>Abrir el creador de Search</Link>.
      </Aviso>
    ) : (
      <Cargando texto="Abriendo el editor…" />
    )
  }

  const formato = buscarFormato(banner.formatoId)
  const seleccionados = diseno.banners.filter((b) => b.seleccionado).length

  return (
    <div className="editor">
      {dialogo}

      {selectorImagen ? (
        <SelectorImagenes
          titulo={selectorImagen === 'fondo' ? 'Fotografía de fondo' : selectorImagen === 'logo' ? 'Logotipo' : 'Imagen'}
          onCerrar={() => setSelectorImagen(null)}
          onElegir={(img) => elegirImagen(img.src, img.nombre, { ancho: img.ancho, alto: img.alto }, img.id)}
        />
      ) : null}

      <div className="editor__cabecera">
        <div>
          <p className="migas">
            <Link to="/proyectos">Proyectos</Link> <Icono nombre="derecha" tamano={14} /> {proyecto.nombre}
          </p>
          <h2>Editor de banners</h2>
          <p style={{ color: 'var(--txt-suave)', fontSize: 'var(--t-sm)' }}>
            {diseno.estiloLibre ? 'Estilo libre' : `Marca ${marca?.nombre ?? 'sin asignar'}`} ·{' '}
            {diseno.banners.length} formatos · {seleccionados} seleccionados
            {cambiosSinGuardar ? ' · cambios sin guardar' : ''}
          </p>
        </div>
        <div className="editor__acciones">
          {/* Deshacer y rehacer a la vista: el atajo de teclado no basta si no
              hay nada en pantalla que diga que la acción existe. */}
          <Boton
            variante="terciario"
            icono="deshacer"
            pequeno
            className="btn--icono"
            aria-label="Deshacer (Ctrl+Z)"
            title="Deshacer · Ctrl+Z"
            disabled={!pasos.puedeDeshacer}
            onClick={() => aplicarPaso(pasos.deshacer())}
          />
          <Boton
            variante="terciario"
            icono="rehacer"
            pequeno
            className="btn--icono"
            aria-label="Rehacer (Ctrl+Shift+Z)"
            title="Rehacer · Ctrl+Shift+Z"
            disabled={!pasos.puedeRehacer}
            onClick={() => aplicarPaso(pasos.rehacer())}
          />
          {proyecto.canales.includes('search') ? (
            <Boton variante="secundario" icono="buscar" pequeno onClick={() => navegar(`/campanas/${proyecto.id}/search`)}>
              Search
            </Boton>
          ) : null}
          <Boton variante="secundario" icono="replicar" pequeno onClick={replicar}>
            Replicar
          </Boton>
          <Boton variante="secundario" icono="ojo" pequeno onClick={() => setVistaPrevia(true)}>
            Vista previa
          </Boton>
          <Boton variante="secundario" icono="exportar" pequeno onClick={() => setModalExport(true)}>
            Exportar
          </Boton>
          <Boton icono="guardar" pequeno cargando={guardando} onClick={() => guardar()}>
            Guardar
          </Boton>
        </div>
      </div>

      <div className="editor__movil">
        <Tabs
          etiqueta="Zonas del editor"
          valor={panelMovil}
          onCambio={setPanelMovil}
          opciones={[
            { id: 'formatos', nombre: 'Formatos' },
            { id: 'lienzo', nombre: 'Lienzo' },
            { id: 'propiedades', nombre: 'Propiedades' },
          ]}
        />
      </div>

      <div className="editor__cuerpo">
        <aside className={`editor__formatos${panelMovil === 'formatos' ? ' editor__panel--visible' : ''}`}>
          <div className="editor__formatos-cabecera">
            <h3>Formatos</h3>
            <div className="botonera">
              <Boton
                variante="terciario"
                pequeno
                onClick={() =>
                  setDiseno({ ...diseno, banners: diseno.banners.map((b) => ({ ...b, seleccionado: true })) })
                }
              >
                Todos
              </Boton>
              <Boton
                variante="terciario"
                pequeno
                onClick={() =>
                  setDiseno({ ...diseno, banners: diseno.banners.map((b) => ({ ...b, seleccionado: false })) })
                }
              >
                Ninguno
              </Boton>
            </div>
          </div>

          <ul className="lista-formatos" role="list">
            {diseno.banners.map((b, i) => (
              <li key={b.formatoId}>
                <div className={`formato${i === indice ? ' formato--activo' : ''}`}>
                  <input
                    type="checkbox"
                    checked={b.seleccionado}
                    onChange={(e) => {
                      const banners = diseno.banners.map((x, j) =>
                        j === i ? { ...x, seleccionado: e.target.checked } : x,
                      )
                      setDiseno({ ...diseno, banners })
                      setCambiosSinGuardar(true)
                    }}
                    aria-label={`Incluir ${b.ancho} por ${b.alto} en vista previa y exportación`}
                  />
                  <button
                    type="button"
                    className="formato__boton"
                    onClick={() => {
                      setIndice(i)
                      setSeleccionadoId(null)
                      setPanelMovil('lienzo')
                    }}
                    aria-current={i === indice}
                  >
                    <MiniaturaBanner banner={b} ancho={72} alto={54} />
                    <span className="formato__datos">
                      <span className="formato__medida">{etiquetaFormato(b)}</span>
                      <span className="formato__nombre">{buscarFormato(b.formatoId)?.nombre}</span>
                      <span className="formato__marcas">
                        {b.base ? <span className="chip chip--marca">Base</span> : null}
                        {b.ajustadoManualmente ? <span className="chip chip--alerta">Ajustado</span> : null}
                      </span>
                    </span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section
          className={`editor__lienzo${panelMovil === 'lienzo' ? ' editor__panel--visible' : ''}`}
          ref={contenedorLienzo}
          // Pulsar en cualquier zona libre de la columna del lienzo deselecciona.
          // Antes sólo servía el interior del banner, así que quien pinchaba en el
          // margen gris se quedaba con el elemento seleccionado sin saber por qué.
          onPointerDown={(ev) => {
            const destino = ev.target as HTMLElement
            if (!destino.closest('.caja') && !destino.closest('.editor__herramientas')) setSeleccionadoId(null)
          }}
        >
          <div className="editor__herramientas">
            {/* Tres grupos con nombre en vez de siete botones en fila: se busca por
                el tipo de cosa que se quiere añadir, no leyendo todo el listado. */}
            <div className="editor__grupo">
              <span className="editor__grupo-titulo">Texto</span>
              <div className="editor__grupo-botones">
                <Boton variante="secundario" pequeno icono="texto" onClick={() => anadirElemento(crearTexto(banner, marca))}>
                  Texto
                </Boton>
                <Boton variante="secundario" pequeno icono="enlace" onClick={() => anadirElemento(crearCta(banner, marca))}>
                  Botón CTA
                </Boton>
              </div>
            </div>

            <div className="editor__grupo">
              <span className="editor__grupo-titulo">Formas</span>
              <div className="editor__grupo-botones">
                <Boton variante="secundario" pequeno icono="rectangulo" onClick={() => anadirElemento(crearRectangulo(banner, marca))}>
                  Rectángulo
                </Boton>
                <Boton variante="secundario" pequeno icono="cuadrado" onClick={() => anadirElemento(crearCuadrado(banner, marca))}>
                  Cuadrado
                </Boton>
                <Boton variante="secundario" pequeno icono="circulo" onClick={() => anadirElemento(crearCirculo(banner, marca))}>
                  Círculo
                </Boton>
              </div>
            </div>

            <div className="editor__grupo">
              <span className="editor__grupo-titulo">Imágenes</span>
              <div className="editor__grupo-botones">
                <Boton variante="secundario" pequeno icono="imagen" onClick={() => setSelectorImagen('nuevo-elemento')}>
                  Foto
                </Boton>
                <Boton variante="secundario" pequeno icono="logo" onClick={() => setSelectorImagen('logo')}>
                  Logo
                </Boton>
              </div>
            </div>

            {marca?.logos.length ? (
              <div className="editor__logos-marca">
                <span className="editor__herramientas-titulo">Logos de {marca.nombre}</span>
                {marca.logos.map((logo) => (
                  <button
                    key={logo.id}
                    type="button"
                    className="logo-marca"
                    onClick={() => anadirElemento(crearLogo(banner, logo.src, logo.nombre))}
                    title={`Añadir ${logo.nombre}`}
                  >
                    <img src={logo.src} alt={logo.nombre} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="editor__escenario">
            <div className="editor__info-formato">
              <strong>
                {formato?.nombre} · {etiquetaFormato(banner)}
              </strong>
              <span>{esBase ? 'Lienzo base: lo que dibujes aquí se replica al resto.' : descripcionModo(modoPara(banner.ancho, banner.alto))}</span>
            </div>

            <Lienzo
              banner={banner}
              escala={zoom}
              seleccionadoId={seleccionadoId}
              onSeleccionar={setSeleccionadoId}
              onCambiar={cambiarElemento}
              onFinDeGesto={cerrarGesto}
            />

            <div className="editor__zoom">
              <Boton
                variante="terciario"
                pequeno
                className="btn--icono"
                onClick={() => setZoom((z) => Math.max(0.1, Number((z - 0.1).toFixed(2))))}
                aria-label="Reducir zoom"
              >
                −
              </Boton>
              <span>{Math.round(zoom * 100)}%</span>
              <Boton
                variante="terciario"
                pequeno
                className="btn--icono"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))))}
                aria-label="Aumentar zoom"
              >
                +
              </Boton>
              <Boton variante="terciario" pequeno onClick={() => setZoom(1)}>
                100%
              </Boton>
            </div>
          </div>

          {banner.elementos.length === 0 ? (
            <Aviso tipo="info" titulo="Lienzo en blanco">
              Empieza por el fondo y añade formas, textos y el logo. Cuando el 300 × 250 esté listo, guarda y pulsa
              “Replicar” para generar el resto de los formatos.
            </Aviso>
          ) : null}
        </section>

        <aside className={`editor__inspector${panelMovil === 'propiedades' ? ' editor__panel--visible' : ''}`}>
          <Inspector
            banner={banner}
            elemento={elemento}
            marca={marca}
            paleta={paleta}
            onCambiarElemento={cambiarElemento}
            onCambiarFondo={(fondo) => actualizarBanner({ fondo })}
            onCambiarEnlace={(enlace) => actualizarBanner({ enlace })}
            onOrden={ordenar}
            onDuplicar={() => {
              if (elemento) anadirElemento(duplicarElemento(elemento, banner))
            }}
            onEliminar={eliminarSeleccionado}
            onElegirFondoImagen={() => setSelectorImagen('fondo')}
            onCambiarImagen={() => setSelectorImagen('elemento')}
          />
        </aside>
      </div>

      {vistaPrevia ? (
        <Modal
          titulo="Vista previa"
          descripcion={`${seleccionados} formato(s) seleccionados`}
          ancho
          onCerrar={() => setVistaPrevia(false)}
          pie={
            <>
              <Boton variante="secundario" onClick={() => setVistaPrevia(false)}>
                Cerrar
              </Boton>
              <Boton
                icono="exportar"
                onClick={() => {
                  setVistaPrevia(false)
                  setModalExport(true)
                }}
              >
                Exportar seleccionados
              </Boton>
            </>
          }
        >
          <div className="previa">
            {diseno.banners
              .filter((b) => b.seleccionado)
              .map((b) => (
                <figure key={b.formatoId} className="previa__pieza">
                  <MiniaturaBanner banner={b} ancho={260} alto={260} borde />
                  <figcaption>
                    {etiquetaFormato(b)} · {buscarFormato(b.formatoId)?.nombre}
                  </figcaption>
                </figure>
              ))}
            {seleccionados === 0 ? <p>No hay formatos seleccionados. Márcalos en la lista de la izquierda.</p> : null}
          </div>
        </Modal>
      ) : null}

      {modalExport ? (
        <Modal
          titulo="Exportar campaña"
          descripcion={`Se exportarán ${seleccionados} formato(s) seleccionados en un archivo ZIP.`}
          onCerrar={() => setModalExport(false)}
          pie={
            <>
              <Boton variante="secundario" onClick={() => setModalExport(false)}>
                Cancelar
              </Boton>
              <Boton icono="exportar" cargando={exportando} onClick={exportar}>
                Exportar
              </Boton>
            </>
          }
        >
          <div className="seccion">
            <label className="check">
              <input
                type="checkbox"
                checked={opcionesExport.jpg}
                onChange={(e) => setOpcionesExport({ ...opcionesExport, jpg: e.target.checked })}
              />
              JPG (imagen lista para subir)
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={opcionesExport.html}
                onChange={(e) => setOpcionesExport({ ...opcionesExport, html: e.target.checked })}
              />
              HTML5 con clickTag (Google Ads y Campaign Manager)
            </label>

            {opcionesExport.jpg ? (
              <Campo etiqueta="Resolución del JPG">
                {(props) => (
                  <select
                    {...props}
                    className="input"
                    value={opcionesExport.escalaJpg}
                    onChange={(e) => setOpcionesExport({ ...opcionesExport, escalaJpg: Number(e.target.value) })}
                  >
                    <option value={1}>1x · medida exacta del formato (para subir a Google Ads)</option>
                    <option value={2}>2x · alta resolución (presentaciones y pantallas nítidas)</option>
                    <option value={3}>3x · máxima resolución</option>
                  </select>
                )}
              </Campo>
            ) : null}

            {opcionesExport.jpg ? (
              <p style={{ fontSize: 'var(--t-xs)', color: 'var(--txt-suave)', margin: 0 }}>
                {opcionesExport.escalaJpg > 1
                  ? `Cada pieza saldrá a ${opcionesExport.escalaJpg} veces su medida (por ejemplo, 300 × 250 se exporta a ${300 * opcionesExport.escalaJpg} × ${250 * opcionesExport.escalaJpg} px). Se ve nítida, pero para subirla a Google Ads hay que exportarla a 1x.`
                  : 'Cada pieza saldrá con la medida exacta que exige el formato, lista para subir.'}
              </p>
            ) : null}

            {opcionesExport.jpg ? (
              <Campo etiqueta={`Calidad del JPG: ${Math.round(opcionesExport.calidadJpg * 100)}%`}>
                {(props) => (
                  <input
                    {...props}
                    className="rango"
                    type="range"
                    min={60}
                    max={100}
                    value={Math.round(opcionesExport.calidadJpg * 100)}
                    onChange={(e) => setOpcionesExport({ ...opcionesExport, calidadJpg: Number(e.target.value) / 100 })}
                  />
                )}
              </Campo>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
