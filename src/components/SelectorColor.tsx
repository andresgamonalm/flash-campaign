import { useId } from 'react'

interface Props {
  etiqueta: string
  valor: string
  onCambio: (color: string) => void
  paleta: string[]
  permitirTransparente?: boolean
}

/** Colores predeterminados de la marca más paleta mezcladora libre. */
export function SelectorColor({ etiqueta, valor, onCambio, paleta, permitirTransparente = false }: Props) {
  const id = useId()
  const esTransparente = valor === 'transparent'

  return (
    <div className="campo">
      <span className="campo__label" id={`${id}-etq`}>
        {etiqueta}
      </span>

      <div className="muestras" role="group" aria-labelledby={`${id}-etq`}>
        {paleta.map((color) => (
          <button
            key={color}
            type="button"
            className={`muestra${valor.toLowerCase() === color.toLowerCase() ? ' muestra--activa' : ''}`}
            style={{ background: color }}
            onClick={() => onCambio(color)}
            aria-label={`Usar color ${color}`}
            aria-pressed={valor.toLowerCase() === color.toLowerCase()}
            title={color}
          />
        ))}
        {permitirTransparente ? (
          <button
            type="button"
            className={`muestra muestra--transparente${esTransparente ? ' muestra--activa' : ''}`}
            onClick={() => onCambio('transparent')}
            aria-label="Sin relleno"
            aria-pressed={esTransparente}
            title="Sin relleno"
          />
        ) : null}
      </div>

      <div className="mezclador">
        <input
          id={id}
          type="color"
          className="mezclador__rueda"
          value={esTransparente ? '#ffffff' : normalizar(valor)}
          onChange={(e) => onCambio(e.target.value.toUpperCase())}
          aria-label={`${etiqueta}: paleta mezcladora`}
        />
        <input
          type="text"
          className="input mezclador__hex"
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          aria-label={`${etiqueta}: código hexadecimal`}
          spellCheck={false}
        />
      </div>
    </div>
  )
}

function normalizar(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#000000'
}
