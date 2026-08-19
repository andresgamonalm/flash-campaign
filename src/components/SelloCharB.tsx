import { useEffect, useState } from 'react'
import { api } from '../lib/api'

/**
 * Sello de Char B.
 *
 * El retrato es el mismo personaje que ya usa Simple Block Builder, para que sea
 * reconocible entre los dos aplicativos. Si en la biblioteca de imágenes existe
 * una versión distinta (un archivo llamado «char b», «char-b» o «charb»), esa
 * manda: así el retrato se puede cambiar sin volver a publicar el aplicativo.
 */

const RETRATO = '/brand/flash-campaign/char_b.png'
const PATRON = /char[\s_-]*b/i

export function SelloCharB() {
  const [src, setSrc] = useState(RETRATO)

  useEffect(() => {
    let vivo = true
    async function buscar() {
      try {
        const { imagenes } = await api.listarImagenes()
        const propio = imagenes.find((i) => PATRON.test(i.nombre))
        if (vivo && propio) setSrc(propio.src)
      } catch {
        // La biblioteca no es imprescindible para pintar la cabecera: si falla,
        // se queda el retrato que viaja con el proyecto.
      }
    }
    void buscar()
    return () => {
      vivo = false
    }
  }, [])

  return (
    <span className="sello-char-b" aria-hidden={false}>
      <img
        className="sello-char-b__cara"
        src={src}
        alt="Char B, asistente de Google Search"
        onError={() => setSrc(RETRATO)}
      />
    </span>
  )
}
