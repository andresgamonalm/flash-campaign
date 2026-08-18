import type { Marca } from './types'

/**
 * Marca Zurich construida con el material entregado en `Info-Zurich`:
 * el brandbook 2024 define la paleta y la tipografía, y los logotipos se
 * extrajeron del propio manual (ver `scripts/extract_zurich_assets.py`).
 * Los colores inclusivos provienen de las piezas reales de `Referencias-GADS`.
 */
export const MARCA_ZURICH: Marca = {
  id: 'marca_zurich',
  nombre: 'Zurich',
  propietarioId: null,
  esSistema: true,
  descripcion:
    'Marca predeterminada. Paleta, logotipo y tipografía tomados del Brandbook Zurich 2024 incluido en el proyecto.',
  colores: [
    '#2167AE', // Azul de Zúrich — color héroe
    '#23366F', // Azul oscuro
    '#1FB1E6', // Celeste
    '#5495CF', // Azul medio
    '#DAD2BD', // Piedra arenisca
    '#ECEEEF', // Blanco de Zúrich
    '#FFFFFF',
    '#C44693', // Color inclusivo — campaña Auto Digital
    '#F16F6D', // Color inclusivo — campaña 1 cuota gratis
    '#E4B273', // Color inclusivo — campaña SOAPcheck
  ],
  colorTexto: '#FFFFFF',
  logos: [
    {
      id: 'zurich_horizontal',
      nombre: 'Logotipo horizontal',
      src: '/brand/zurich/zurich_logo_horizontal.png',
      variante: 'color',
    },
    {
      id: 'zurich_horizontal_blanco',
      nombre: 'Logotipo horizontal blanco',
      src: '/brand/zurich/zurich_logo_horizontal_blanco.png',
      variante: 'blanco',
    },
    {
      id: 'zurich_isotipo',
      nombre: 'Z sonriente',
      src: '/brand/zurich/zurich_isotipo.png',
      variante: 'color',
    },
    {
      id: 'zurich_isotipo_blanco',
      nombre: 'Z sonriente blanca',
      src: '/brand/zurich/zurich_isotipo_blanco.png',
      variante: 'blanco',
    },
  ],
  // El brandbook indica Zurich Sans como fuente principal y Arial como
  // alternativa autorizada cuando Zurich Sans no está disponible.
  tipografia: { titulo: 'Arial', cuerpo: 'Arial' },
  radio: 8,
  creadoEn: '2026-01-01T00:00:00.000Z',
  actualizadoEn: '2026-01-01T00:00:00.000Z',
}

/** Paleta de arranque para las campañas de estilo libre. */
export const PALETA_LIBRE = [
  '#FFFFFF',
  '#F5F5F5',
  '#111111',
  '#040764',
  '#1C73CB',
  '#20B6B6',
  '#FCE865',
  '#B318A3',
  '#CF1717',
  '#22C35D',
]

export const MARCAS_SISTEMA: Marca[] = [MARCA_ZURICH]

export const FUENTES_DISPONIBLES = [
  { id: 'Arial', nombre: 'Arial (alternativa oficial de Zurich Sans)' },
  { id: 'Helvetica', nombre: 'Helvetica' },
  { id: 'Roboto', nombre: 'Roboto' },
  { id: 'Georgia', nombre: 'Georgia' },
  { id: 'Times New Roman', nombre: 'Times New Roman' },
  { id: 'Verdana', nombre: 'Verdana' },
  { id: 'Tahoma', nombre: 'Tahoma' },
  { id: 'Trebuchet MS', nombre: 'Trebuchet MS' },
  { id: 'Courier New', nombre: 'Courier New' },
]

export function marcaVacia(propietarioId: string): Marca {
  const ahora = new Date().toISOString()
  return {
    id: `marca_${crypto.randomUUID()}`,
    nombre: '',
    propietarioId,
    esSistema: false,
    descripcion: '',
    colores: ['#040764', '#1C73CB', '#20B6B6', '#FCE865', '#FFFFFF'],
    colorTexto: '#FFFFFF',
    logos: [],
    tipografia: { titulo: 'Arial', cuerpo: 'Arial' },
    radio: 8,
    creadoEn: ahora,
    actualizadoEn: ahora,
  }
}
