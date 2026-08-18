/**
 * Recursos visuales seleccionados en Envato Elements.
 *
 * Cada entrada apunta primero al archivo licenciado que debe quedar en `public/`
 * y, mientras ese archivo no exista, cae en la vista previa pública de Envato.
 * El registro completo con códigos, autores y estado vive en `ENVATO_ASSETS.md`.
 */

export interface RecursoFoto {
  id: string
  rutaLocal: string
  vistaPrevia: string
  alt: string
  codigoEnvato: string
  autor: string
}

export const FOTO_LOGIN: RecursoFoto = {
  id: 'FOTO-001',
  rutaLocal: '/media/foto_login_flash_campaign.jpg',
  vistaPrevia:
    'https://elements-resized.envatousercontent.com/envato-dam-assets-production/EVA/TRX/9d/c8/29/fb/1c/v1_E10/E10980EY.jpg?w=1600&cf_fit=scale-down&mark-alpha=18&mark=https%3A%2F%2Felements-assets.envato.com%2Fstatic%2Fwatermark4.png&q=85&format=auto&s=714262ef04f33f7d7821ffb4ecca692cb6e8fe05c4b0c0dcbf0dcee1da8ebbf6',
  alt: 'Diseñadora gráfica trabajando con una tableta digital en una oficina moderna',
  codigoEnvato: '7G6KYTX',
  autor: 'Wavebreakmedia',
}

export const FOTO_INICIO: RecursoFoto = {
  id: 'FOTO-002',
  rutaLocal: '/media/foto_inicio_flash_campaign.jpg',
  vistaPrevia:
    'https://elements-resized.envatousercontent.com/envato-dam-assets-production/EVA/TRX/67/52/60/25/73/v1_E10/E109P2JA.jpg?w=1600&cf_fit=scale-down&mark-alpha=18&mark=https%3A%2F%2Felements-assets.envato.com%2Fstatic%2Fwatermark4.png&q=85&format=auto&s=21d78951c20cfbc6939d3b55e95165eebf5c2719ff914c9fc58a1dd9b057460c',
  alt: 'Profesional de marketing revisando el rendimiento de una campaña en pantalla',
  codigoEnvato: 'AK262U6',
  autor: 'DC_Studio',
}

/**
 * Cadena de respaldo de la fotografía: primero el archivo licenciado en `public/`,
 * después la vista previa pública de Envato y, si tampoco carga, se oculta la
 * imagen para que el bloque de color quede limpio en lugar de mostrar el texto
 * alternativo suelto.
 */
export function alFallarFoto(recurso: RecursoFoto) {
  return (evento: React.SyntheticEvent<HTMLImageElement>) => {
    const img = evento.currentTarget
    if (img.dataset.respaldo === 'aplicado') {
      img.dataset.respaldo = 'agotado'
      img.style.display = 'none'
      return
    }
    img.dataset.respaldo = 'aplicado'
    img.src = recurso.vistaPrevia
  }
}
