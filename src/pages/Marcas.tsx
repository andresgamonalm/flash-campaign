import { useCallback, useEffect, useState } from 'react'
import { Aviso, Boton, Campo, Cargando, EstadoVacio, Modal, useAvisar, useConfirmacion } from '../components/ui'
import { Icono } from '../components/Icono'
import { SelectorColor } from '../components/SelectorColor'
import { SelectorImagenes } from '../components/SelectorImagenes'
import { api } from '../lib/api'
import { useSesion } from '../lib/sesion'
import { FUENTES_DISPONIBLES, marcaVacia, PALETA_LIBRE } from '../lib/marcas'
import type { Marca } from '../lib/types'

export function Marcas() {
  const { usuario, esAdmin } = useSesion()
  const avisar = useAvisar()
  const { confirmar, dialogo } = useConfirmacion()

  const [marcas, setMarcas] = useState<Marca[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [edicion, setEdicion] = useState<Marca | null>(null)
  const [selectorLogo, setSelectorLogo] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setMarcas(await api.listarMarcas())
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function guardar() {
    if (!edicion) return
    if (!edicion.nombre.trim()) {
      avisar('La marca necesita un nombre.', 'alerta')
      return
    }
    setGuardando(true)
    try {
      await api.guardarMarca(edicion)
      avisar('Marca guardada.', 'exito')
      setEdicion(null)
      await cargar()
    } catch (e) {
      avisar((e as Error).message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(marca: Marca) {
    const ok = await confirmar(
      'Eliminar marca',
      `Se eliminará "${marca.nombre}". Las campañas que la usaban conservan su diseño, pero pierden la paleta y los logos guardados.`,
      'Eliminar',
    )
    if (!ok) return
    try {
      await api.eliminarMarca(marca.id)
      avisar('Marca eliminada.', 'exito')
      await cargar()
    } catch (e) {
      avisar((e as Error).message, 'error')
    }
  }

  function cambiarColor(indice: number, color: string) {
    if (!edicion) return
    setEdicion({ ...edicion, colores: edicion.colores.map((c, i) => (i === indice ? color : c)) })
  }

  return (
    <div className="seccion">
      {dialogo}

      <div className="seccion__cabecera">
        <div>
          <h2>Marcas</h2>
          <p style={{ color: 'var(--txt-suave)' }}>
            Guarda paleta, logotipos y tipografía para reutilizarlos en cada campaña. Zurich viene creada con el material
            del brandbook 2024.
          </p>
        </div>
        <Boton icono="mas" onClick={() => setEdicion(marcaVacia(usuario?.id ?? ''))}>
          Crear marca
        </Boton>
      </div>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      {!marcas ? (
        <Cargando texto="Cargando marcas…" />
      ) : marcas.length === 0 ? (
        <EstadoVacio titulo="Sin marcas" descripcion="Crea una marca para reutilizar su paleta y sus logotipos." />
      ) : (
        <div className="rejilla rejilla--3">
          {marcas.map((m) => (
            <article key={m.id} className="panel seccion">
              <div className="seccion__cabecera">
                <h3>{m.nombre}</h3>
                {m.esSistema ? <span className="chip chip--marca">Predeterminada</span> : null}
              </div>

              {m.descripcion ? (
                <p style={{ fontSize: 'var(--t-sm)', color: 'var(--txt-suave)' }}>{m.descripcion}</p>
              ) : null}

              <div className="marca-vista__colores">
                {m.colores.map((c, i) => (
                  <span key={`${c}-${i}`} style={{ background: c }} title={c} />
                ))}
              </div>

              {m.logos.length ? (
                <div className="marca-logos">
                  {m.logos.map((logo) => (
                    <div key={logo.id} className={`marca-logo${logo.variante === 'blanco' ? ' marca-logo--oscuro' : ''}`}>
                      <img src={logo.src} alt={logo.nombre} />
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 'var(--t-sm)', color: 'var(--txt-suave)' }}>Sin logotipos cargados.</p>
              )}

              <p style={{ fontSize: 'var(--t-sm)', color: 'var(--txt-suave)' }}>
                Tipografía: {m.tipografia.titulo}
              </p>

              <div className="botonera">
                <Boton
                  variante="secundario"
                  pequeno
                  icono="marcas"
                  onClick={() => setEdicion(structuredClone(m))}
                  disabled={m.esSistema && !esAdmin}
                >
                  {m.esSistema && !esAdmin ? 'Sólo lectura' : 'Editar'}
                </Boton>
                {!m.esSistema ? (
                  <Boton variante="terciario" pequeno onClick={() => eliminar(m)}>
                    Eliminar
                  </Boton>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {edicion ? (
        <Modal
          titulo={edicion.nombre ? `Editar ${edicion.nombre}` : 'Crear marca'}
          ancho
          onCerrar={() => setEdicion(null)}
          pie={
            <>
              <Boton variante="secundario" onClick={() => setEdicion(null)}>
                Cancelar
              </Boton>
              <Boton icono="guardar" cargando={guardando} onClick={guardar}>
                Guardar marca
              </Boton>
            </>
          }
        >
          {selectorLogo ? (
            <SelectorImagenes
              titulo="Logotipo de la marca"
              onCerrar={() => setSelectorLogo(false)}
              onElegir={(img) =>
                setEdicion({
                  ...edicion,
                  logos: [
                    ...edicion.logos,
                    { id: img.id, nombre: img.nombre, src: img.src, variante: 'color' },
                  ],
                })
              }
            />
          ) : null}

          <Campo etiqueta="Nombre de la marca" requerido>
            {(props) => (
              <input
                {...props}
                className="input"
                value={edicion.nombre}
                onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })}
                maxLength={60}
              />
            )}
          </Campo>

          <Campo etiqueta="Descripción" ayuda="Opcional. Sirve para recordar cuándo usarla.">
            {(props) => (
              <input
                {...props}
                className="input"
                value={edicion.descripcion ?? ''}
                onChange={(e) => setEdicion({ ...edicion, descripcion: e.target.value })}
                maxLength={160}
              />
            )}
          </Campo>

          <fieldset className="grupo-campos">
            <legend className="campo__label">Paleta de la marca</legend>
            <div className="rejilla rejilla--2">
              {edicion.colores.map((color, i) => (
                <SelectorColor
                  key={i}
                  etiqueta={`Color ${i + 1}`}
                  valor={color}
                  paleta={PALETA_LIBRE}
                  onCambio={(nuevo) => cambiarColor(i, nuevo)}
                />
              ))}
            </div>
            <div className="botonera">
              <Boton
                variante="secundario"
                pequeno
                icono="mas"
                onClick={() => setEdicion({ ...edicion, colores: [...edicion.colores, '#FFFFFF'] })}
              >
                Añadir color
              </Boton>
              {edicion.colores.length > 1 ? (
                <Boton
                  variante="terciario"
                  pequeno
                  onClick={() => setEdicion({ ...edicion, colores: edicion.colores.slice(0, -1) })}
                >
                  Quitar el último
                </Boton>
              ) : null}
            </div>
          </fieldset>

          <SelectorColor
            etiqueta="Color de texto sobre la marca"
            valor={edicion.colorTexto}
            paleta={edicion.colores}
            onCambio={(colorTexto) => setEdicion({ ...edicion, colorTexto })}
          />

          <div className="rejilla rejilla--2">
            <Campo etiqueta="Tipografía de títulos">
              {(props) => (
                <select
                  {...props}
                  className="select"
                  value={edicion.tipografia.titulo}
                  onChange={(e) => setEdicion({ ...edicion, tipografia: { ...edicion.tipografia, titulo: e.target.value } })}
                >
                  {FUENTES_DISPONIBLES.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <Campo etiqueta="Tipografía de cuerpo">
              {(props) => (
                <select
                  {...props}
                  className="select"
                  value={edicion.tipografia.cuerpo}
                  onChange={(e) => setEdicion({ ...edicion, tipografia: { ...edicion.tipografia, cuerpo: e.target.value } })}
                >
                  {FUENTES_DISPONIBLES.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
          </div>

          <div className="campo">
            <span className="campo__label">Logotipos</span>
            <span className="campo__ayuda">Sube el logo a la biblioteca y añádelo aquí para tenerlo a mano en el editor.</span>
            <div className="miniaturas">
              {edicion.logos.map((logo, i) => (
                <div key={`${logo.id}-${i}`} className={`miniatura${logo.variante === 'blanco' ? ' miniatura--oscura' : ''}`}>
                  <img src={logo.src} alt={logo.nombre} />
                  <button
                    type="button"
                    className="miniatura__quitar"
                    onClick={() => setEdicion({ ...edicion, logos: edicion.logos.filter((_, j) => j !== i) })}
                    aria-label={`Quitar ${logo.nombre}`}
                  >
                    <Icono nombre="cerrar" tamano={14} />
                  </button>
                  <button
                    type="button"
                    className="miniatura__variante"
                    onClick={() =>
                      setEdicion({
                        ...edicion,
                        logos: edicion.logos.map((l, j) =>
                          j === i ? { ...l, variante: l.variante === 'color' ? 'blanco' : 'color' } : l,
                        ),
                      })
                    }
                  >
                    {logo.variante === 'blanco' ? 'Para fondo oscuro' : 'Para fondo claro'}
                  </button>
                </div>
              ))}
              <Boton variante="secundario" icono="subir" onClick={() => setSelectorLogo(true)}>
                Añadir logotipo
              </Boton>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
