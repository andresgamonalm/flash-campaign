import { Boton, Campo } from './ui'
import { Icono } from './Icono'
import { SelectorColor } from './SelectorColor'
import { FILTROS } from '../lib/render'
import { FUENTES_DISPONIBLES } from '../lib/marcas'
import type { Banner, Elemento, Fondo, Marca, PresetFiltro } from '../lib/types'

interface Props {
  banner: Banner
  elemento: Elemento | null
  marca: Marca | null
  paleta: string[]
  onCambiarElemento: (elemento: Elemento) => void
  onCambiarFondo: (fondo: Fondo) => void
  onCambiarEnlace: (enlace: Banner['enlace']) => void
  onOrden: (direccion: 'adelante' | 'atras' | 'frente' | 'fondo') => void
  onDuplicar: () => void
  onEliminar: () => void
  onElegirFondoImagen: () => void
  onCambiarImagen: () => void
}

export function Inspector({
  banner,
  elemento,
  marca,
  paleta,
  onCambiarElemento,
  onCambiarFondo,
  onCambiarEnlace,
  onOrden,
  onDuplicar,
  onEliminar,
  onElegirFondoImagen,
  onCambiarImagen,
}: Props) {
  const fuentes = marca
    ? [{ id: marca.tipografia.titulo, nombre: `${marca.tipografia.titulo} (marca)` }, ...FUENTES_DISPONIBLES.filter((f) => f.id !== marca.tipografia.titulo)]
    : FUENTES_DISPONIBLES

  return (
    <div className="inspector">
      <section className="inspector__grupo">
        <h3>Fondo del banner</h3>

        <div className="segmentado" role="group" aria-label="Tipo de fondo">
          <button
            type="button"
            className={`segmentado__item${banner.fondo.tipo === 'color' ? ' segmentado__item--activo' : ''}`}
            onClick={() => onCambiarFondo({ ...banner.fondo, tipo: 'color' })}
            aria-pressed={banner.fondo.tipo === 'color'}
          >
            Color plano
          </button>
          <button
            type="button"
            className={`segmentado__item${banner.fondo.tipo === 'imagen' ? ' segmentado__item--activo' : ''}`}
            onClick={() => onCambiarFondo({ ...banner.fondo, tipo: 'imagen' })}
            aria-pressed={banner.fondo.tipo === 'imagen'}
          >
            Fotografía
          </button>
        </div>

        <SelectorColor
          etiqueta={banner.fondo.tipo === 'imagen' ? 'Color bajo la foto' : 'Color de fondo'}
          valor={banner.fondo.color}
          paleta={paleta}
          onCambio={(color) => onCambiarFondo({ ...banner.fondo, color })}
        />

        {banner.fondo.tipo === 'imagen' ? (
          <>
            <Boton variante="secundario" icono="imagen" bloque onClick={onElegirFondoImagen}>
              {banner.fondo.imagenSrc ? 'Cambiar fotografía' : 'Elegir o subir fotografía'}
            </Boton>

            {banner.fondo.imagenSrc ? (
              <>
                <Campo etiqueta="Encaje de la foto">
                  {(props) => (
                    <select
                      {...props}
                      className="select"
                      value={banner.fondo.ajuste}
                      onChange={(e) => onCambiarFondo({ ...banner.fondo, ajuste: e.target.value as 'cover' | 'contain' })}
                    >
                      <option value="cover">Cubrir el banner (recorta)</option>
                      <option value="contain">Mostrar completa (deja aire)</option>
                    </select>
                  )}
                </Campo>

                <div className="rejilla rejilla--2">
                  <Campo etiqueta="Encuadre horizontal">
                    {(props) => (
                      <input
                        {...props}
                        className="rango"
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(banner.fondo.foco.x * 100)}
                        onChange={(e) =>
                          onCambiarFondo({ ...banner.fondo, foco: { ...banner.fondo.foco, x: Number(e.target.value) / 100 } })
                        }
                      />
                    )}
                  </Campo>
                  <Campo etiqueta="Encuadre vertical">
                    {(props) => (
                      <input
                        {...props}
                        className="rango"
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(banner.fondo.foco.y * 100)}
                        onChange={(e) =>
                          onCambiarFondo({ ...banner.fondo, foco: { ...banner.fondo.foco, y: Number(e.target.value) / 100 } })
                        }
                      />
                    )}
                  </Campo>
                </div>

                <Campo etiqueta="Filtro sobre la imagen">
                  {(props) => (
                    <select
                      {...props}
                      className="select"
                      value={banner.fondo.filtro.preset}
                      onChange={(e) =>
                        onCambiarFondo({
                          ...banner.fondo,
                          filtro: { ...banner.fondo.filtro, preset: e.target.value as PresetFiltro },
                        })
                      }
                    >
                      {FILTROS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </Campo>

                {banner.fondo.filtro.preset !== 'ninguno' ? (
                  <Campo etiqueta={`Intensidad del filtro: ${banner.fondo.filtro.intensidad}%`}>
                    {(props) => (
                      <input
                        {...props}
                        className="rango"
                        type="range"
                        min={0}
                        max={100}
                        value={banner.fondo.filtro.intensidad}
                        onChange={(e) =>
                          onCambiarFondo({
                            ...banner.fondo,
                            filtro: { ...banner.fondo.filtro, intensidad: Number(e.target.value) },
                          })
                        }
                      />
                    )}
                  </Campo>
                ) : null}

                {banner.fondo.filtro.preset === 'tinte_marca' ? (
                  <SelectorColor
                    etiqueta="Color del tinte"
                    valor={banner.fondo.filtro.color ?? paleta[0]}
                    paleta={paleta}
                    onCambio={(color) => onCambiarFondo({ ...banner.fondo, filtro: { ...banner.fondo.filtro, color } })}
                  />
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="inspector__grupo">
        <h3>Enlace del banner</h3>
        <Campo etiqueta="URL del CTA" ayuda="Se aplica al banner completo y viaja como clickTag en la exportación HTML.">
          {(props) => (
            <input
              {...props}
              className="input"
              type="url"
              placeholder="https://"
              value={banner.enlace.url}
              onChange={(e) => onCambiarEnlace({ ...banner.enlace, url: e.target.value })}
            />
          )}
        </Campo>
        <Campo etiqueta="Cómo se abre">
          {(props) => (
            <select
              {...props}
              className="select"
              value={banner.enlace.destino}
              onChange={(e) => onCambiarEnlace({ ...banner.enlace, destino: e.target.value as '_blank' | '_self' })}
            >
              <option value="_blank">En una ventana nueva</option>
              <option value="_self">En la misma ventana</option>
            </select>
          )}
        </Campo>
      </section>

      {elemento ? (
        <section className="inspector__grupo">
          <div className="inspector__titulo">
            <h3>{elemento.nombre}</h3>
            <div className="inspector__acciones">
              <Boton variante="terciario" pequeno icono="copiar" onClick={onDuplicar} aria-label="Duplicar elemento" />
              <Boton variante="terciario" pequeno icono="basura" onClick={onEliminar} aria-label="Eliminar elemento" />
            </div>
          </div>

          <div className="rejilla rejilla--2">
            <Campo etiqueta="X">
              {(props) => (
                <input
                  {...props}
                  className="input"
                  type="number"
                  value={Math.round(elemento.x)}
                  onChange={(e) => onCambiarElemento({ ...elemento, x: Number(e.target.value) })}
                />
              )}
            </Campo>
            <Campo etiqueta="Y">
              {(props) => (
                <input
                  {...props}
                  className="input"
                  type="number"
                  value={Math.round(elemento.y)}
                  onChange={(e) => onCambiarElemento({ ...elemento, y: Number(e.target.value) })}
                />
              )}
            </Campo>
            <Campo etiqueta="Ancho">
              {(props) => (
                <input
                  {...props}
                  className="input"
                  type="number"
                  min={8}
                  value={Math.round(elemento.w)}
                  onChange={(e) => onCambiarElemento({ ...elemento, w: Math.max(8, Number(e.target.value)) })}
                />
              )}
            </Campo>
            <Campo etiqueta="Alto">
              {(props) => (
                <input
                  {...props}
                  className="input"
                  type="number"
                  min={8}
                  value={Math.round(elemento.h)}
                  onChange={(e) => onCambiarElemento({ ...elemento, h: Math.max(8, Number(e.target.value)) })}
                />
              )}
            </Campo>
          </div>

          <div className="campo">
            <span className="campo__label">Disposición respecto al fondo</span>
            <div className="botonera">
              <Boton variante="secundario" pequeno icono="adelante" onClick={() => onOrden('frente')}>
                Al frente
              </Boton>
              <Boton variante="secundario" pequeno onClick={() => onOrden('adelante')}>
                Adelante
              </Boton>
              <Boton variante="secundario" pequeno onClick={() => onOrden('atras')}>
                Atrás
              </Boton>
              <Boton variante="secundario" pequeno icono="atras" onClick={() => onOrden('fondo')}>
                Al fondo
              </Boton>
            </div>
          </div>

          <label className="check">
            <input
              type="checkbox"
              checked={Boolean(elemento.bloqueado)}
              onChange={(e) => onCambiarElemento({ ...elemento, bloqueado: e.target.checked })}
            />
            Bloquear posición
          </label>

          {elemento.tipo === 'rectangulo' || elemento.tipo === 'circulo' ? (
            <>
              <SelectorColor
                etiqueta="Color de fondo"
                valor={elemento.relleno}
                paleta={paleta}
                permitirTransparente
                onCambio={(relleno) => onCambiarElemento({ ...elemento, relleno })}
              />
              <SelectorColor
                etiqueta="Color de borde"
                valor={elemento.borde}
                paleta={paleta}
                onCambio={(borde) => onCambiarElemento({ ...elemento, borde })}
              />
              <Campo etiqueta={`Grosor del borde: ${elemento.grosorBorde} px`}>
                {(props) => (
                  <input
                    {...props}
                    className="rango"
                    type="range"
                    min={0}
                    max={20}
                    value={elemento.grosorBorde}
                    onChange={(e) => onCambiarElemento({ ...elemento, grosorBorde: Number(e.target.value) })}
                  />
                )}
              </Campo>
              {elemento.tipo === 'rectangulo' ? (
                <Campo etiqueta={`Puntas redondeadas: ${elemento.radio} px`}>
                  {(props) => (
                    <input
                      {...props}
                      className="rango"
                      type="range"
                      min={0}
                      max={Math.round(Math.min(elemento.w, elemento.h) / 2)}
                      value={elemento.radio}
                      onChange={(e) => onCambiarElemento({ ...elemento, radio: Number(e.target.value) })}
                    />
                  )}
                </Campo>
              ) : null}
            </>
          ) : null}

          {elemento.tipo === 'texto' ? (
            <>
              <Campo etiqueta="Texto">
                {(props) => (
                  <textarea
                    {...props}
                    className="textarea"
                    rows={3}
                    value={elemento.texto}
                    onChange={(e) => onCambiarElemento({ ...elemento, texto: e.target.value })}
                  />
                )}
              </Campo>

              <Campo etiqueta="Tipografía">
                {(props) => (
                  <select
                    {...props}
                    className="select"
                    value={elemento.fuente}
                    onChange={(e) => onCambiarElemento({ ...elemento, fuente: e.target.value })}
                  >
                    {fuentes.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </Campo>

              <div className="rejilla rejilla--2">
                <Campo etiqueta="Tamaño (px)">
                  {(props) => (
                    <input
                      {...props}
                      className="input"
                      type="number"
                      min={6}
                      max={400}
                      value={elemento.tamano}
                      onChange={(e) => onCambiarElemento({ ...elemento, tamano: Number(e.target.value) })}
                    />
                  )}
                </Campo>
                <Campo etiqueta="Peso">
                  {(props) => (
                    <select
                      {...props}
                      className="select"
                      value={elemento.peso}
                      onChange={(e) => onCambiarElemento({ ...elemento, peso: Number(e.target.value) as 400 | 500 | 600 | 700 })}
                    >
                      <option value={400}>Normal</option>
                      <option value={500}>Medio</option>
                      <option value={600}>Semi negrita</option>
                      <option value={700}>Negrita</option>
                    </select>
                  )}
                </Campo>
              </div>

              <SelectorColor
                etiqueta="Color del texto"
                valor={elemento.color}
                paleta={paleta}
                onCambio={(color) => onCambiarElemento({ ...elemento, color })}
              />

              <div className="rejilla rejilla--2">
                <Campo etiqueta="Alineación">
                  {(props) => (
                    <select
                      {...props}
                      className="select"
                      value={elemento.alineacion}
                      onChange={(e) => onCambiarElemento({ ...elemento, alineacion: e.target.value as typeof elemento.alineacion })}
                    >
                      <option value="izquierda">Izquierda</option>
                      <option value="centro">Centro</option>
                      <option value="derecha">Derecha</option>
                    </select>
                  )}
                </Campo>
                <Campo etiqueta="Vertical">
                  {(props) => (
                    <select
                      {...props}
                      className="select"
                      value={elemento.alineacionVertical}
                      onChange={(e) =>
                        onCambiarElemento({ ...elemento, alineacionVertical: e.target.value as typeof elemento.alineacionVertical })
                      }
                    >
                      <option value="arriba">Arriba</option>
                      <option value="centro">Centro</option>
                      <option value="abajo">Abajo</option>
                    </select>
                  )}
                </Campo>
              </div>

              <Campo etiqueta={`Interlineado: ${elemento.interlineado.toFixed(2)}`}>
                {(props) => (
                  <input
                    {...props}
                    className="rango"
                    type="range"
                    min={80}
                    max={200}
                    value={Math.round(elemento.interlineado * 100)}
                    onChange={(e) => onCambiarElemento({ ...elemento, interlineado: Number(e.target.value) / 100 })}
                  />
                )}
              </Campo>

              <fieldset className="grupo-campos">
                <legend className="campo__label">Margen del cuadro (px)</legend>
                <div className="rejilla rejilla--2">
                  {(['arriba', 'derecha', 'abajo', 'izquierda'] as const).map((lado) => (
                    <Campo key={lado} etiqueta={lado[0].toUpperCase() + lado.slice(1)}>
                      {(props) => (
                        <input
                          {...props}
                          className="input"
                          type="number"
                          min={0}
                          max={200}
                          value={Math.round(elemento.margen[lado])}
                          onChange={(e) =>
                            onCambiarElemento({
                              ...elemento,
                              margen: { ...elemento.margen, [lado]: Number(e.target.value) },
                            })
                          }
                        />
                      )}
                    </Campo>
                  ))}
                </div>
              </fieldset>

              <SelectorColor
                etiqueta="Fondo del cuadro de texto"
                valor={elemento.fondo ?? 'transparent'}
                paleta={paleta}
                permitirTransparente
                onCambio={(fondo) => onCambiarElemento({ ...elemento, fondo })}
              />

              <label className="check">
                <input
                  type="checkbox"
                  checked={elemento.autoAjuste}
                  onChange={(e) => onCambiarElemento({ ...elemento, autoAjuste: e.target.checked })}
                />
                Ajustar el cuerpo para que el texto entre en la caja
              </label>
            </>
          ) : null}

          {elemento.tipo === 'imagen' || elemento.tipo === 'logo' ? (
            <>
              <Boton variante="secundario" icono="imagen" bloque onClick={onCambiarImagen}>
                Cambiar archivo
              </Boton>
              <Campo etiqueta="Encaje">
                {(props) => (
                  <select
                    {...props}
                    className="select"
                    value={elemento.ajuste}
                    onChange={(e) => onCambiarElemento({ ...elemento, ajuste: e.target.value as 'contain' | 'cover' })}
                  >
                    <option value="contain">Completa dentro de la caja</option>
                    <option value="cover">Cubrir la caja (recorta)</option>
                  </select>
                )}
              </Campo>
              <Campo etiqueta={`Puntas redondeadas: ${elemento.radio} px`}>
                {(props) => (
                  <input
                    {...props}
                    className="rango"
                    type="range"
                    min={0}
                    max={Math.round(Math.min(elemento.w, elemento.h) / 2)}
                    value={elemento.radio}
                    onChange={(e) => onCambiarElemento({ ...elemento, radio: Number(e.target.value) })}
                  />
                )}
              </Campo>
            </>
          ) : null}
        </section>
      ) : (
        <section className="inspector__grupo inspector__vacio">
          <Icono nombre="mover" tamano={24} />
          <p>Selecciona un elemento del lienzo para editar sus propiedades, o añade uno desde la barra de herramientas.</p>
        </section>
      )}
    </div>
  )
}
