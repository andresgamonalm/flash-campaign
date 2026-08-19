import { useEffect, useState } from 'react'
import { api } from '../lib/api'

/**
 * Sello de Char B.
 *
 * El retrato definitivo del personaje es material de marca que se sube a la
 * biblioteca de imágenes, no un archivo del código: así se puede cambiar sin
 * volver a publicar el aplicativo. Este componente lo busca en la biblioteca por
 * su nombre y, mientras no exista, muestra el sello dibujado que viaja con el
 * proyecto. En ningún caso deja el hueco vacío.
 *
 * Basta con que el archivo se llame «char b», «char-b» o «charb», con cualquier
 * extensión y en cualquier carpeta del bucket.
 */

const RESPALDO = '/brand/flash-campaign/sello_char_b.svg'
const PATRON = /char[\s_-]*b/i

export function SelloCharB() {
  const [src, setSrc] = useState(RESPALDO)

  useEffect(() => {
    let vivo = true
    async function buscar() {
      try {
        const { imagenes } = await api.listarImagenes()
        const retrato = imagenes.find((i) => PATRON.test(i.nombre))
        if (vivo && retrato) setSrc(retrato.src)
      } catch {
        // La biblioteca no es imprescindible para pintar la cabecera: si falla,
        // se queda el sello dibujado y la pantalla sigue funcionando igual.
      }
    }
    void buscar()
    return () => {
      vivo = false
    }
  }, [])

  return (
    <img
      className="sello-char-b"
      src={src}
      alt="Char B, asistente de Google Search"
      width={56}
      height={56}
      onError={() => setSrc(RESPALDO)}
    />
  )
}
