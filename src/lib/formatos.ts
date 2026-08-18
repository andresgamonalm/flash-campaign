import type { Canal } from './types'

export type Orientacion = 'cuadrado' | 'horizontal' | 'vertical'

export interface Formato {
  id: string
  nombre: string
  ancho: number
  alto: number
  canal: Exclude<Canal, 'search'>
  /** El 300x250 es el lienzo de partida que define toda la campaña. */
  base?: boolean
  nota?: string
}

/** Inventario de Google Display, encabezado por el 300x250 que exige el brief. */
export const FORMATOS_DISPLAY: Formato[] = [
  { id: 'gd-300x250', nombre: 'Rectángulo medio', ancho: 300, alto: 250, canal: 'display', base: true, nota: 'Lienzo base de la campaña' },
  { id: 'gd-336x280', nombre: 'Rectángulo grande', ancho: 336, alto: 280, canal: 'display' },
  { id: 'gd-250x250', nombre: 'Cuadrado', ancho: 250, alto: 250, canal: 'display' },
  { id: 'gd-200x200', nombre: 'Cuadrado pequeño', ancho: 200, alto: 200, canal: 'display' },
  { id: 'gd-728x90', nombre: 'Leaderboard', ancho: 728, alto: 90, canal: 'display' },
  { id: 'gd-970x90', nombre: 'Leaderboard grande', ancho: 970, alto: 90, canal: 'display' },
  { id: 'gd-970x250', nombre: 'Billboard', ancho: 970, alto: 250, canal: 'display' },
  { id: 'gd-468x60', nombre: 'Banner', ancho: 468, alto: 60, canal: 'display' },
  { id: 'gd-320x50', nombre: 'Banner móvil', ancho: 320, alto: 50, canal: 'display' },
  { id: 'gd-320x100', nombre: 'Banner móvil grande', ancho: 320, alto: 100, canal: 'display' },
  { id: 'gd-300x600', nombre: 'Media página', ancho: 300, alto: 600, canal: 'display' },
  { id: 'gd-160x600', nombre: 'Rascacielos ancho', ancho: 160, alto: 600, canal: 'display' },
  { id: 'gd-120x600', nombre: 'Rascacielos', ancho: 120, alto: 600, canal: 'display' },
  { id: 'gd-300x1050', nombre: 'Vertical', ancho: 300, alto: 1050, canal: 'display' },
]

/** Formatos de Meta (Facebook e Instagram) de uso habitual en performance. */
export const FORMATOS_META: Formato[] = [
  { id: 'mt-1080x1080', nombre: 'Feed cuadrado 1:1', ancho: 1080, alto: 1080, canal: 'meta' },
  { id: 'mt-1080x1350', nombre: 'Feed vertical 4:5', ancho: 1080, alto: 1350, canal: 'meta' },
  { id: 'mt-1080x1920', nombre: 'Stories y Reels 9:16', ancho: 1080, alto: 1920, canal: 'meta' },
  { id: 'mt-1200x628', nombre: 'Enlace 1.91:1', ancho: 1200, alto: 628, canal: 'meta' },
  { id: 'mt-1080x566', nombre: 'Carrusel ancho', ancho: 1080, alto: 566, canal: 'meta' },
]

export const TODOS_LOS_FORMATOS = [...FORMATOS_DISPLAY, ...FORMATOS_META]

export const FORMATO_BASE = FORMATOS_DISPLAY[0]

export function buscarFormato(id: string): Formato | undefined {
  return TODOS_LOS_FORMATOS.find((f) => f.id === id)
}

export function formatosDeCanales(canales: Canal[]): Formato[] {
  const lista: Formato[] = []
  if (canales.includes('display')) lista.push(...FORMATOS_DISPLAY)
  if (canales.includes('meta')) lista.push(...FORMATOS_META)
  // El lienzo base siempre existe: sin él no hay campaña que replicar.
  if (!lista.some((f) => f.base)) lista.unshift(FORMATO_BASE)
  return lista
}

export function orientacionDe(ancho: number, alto: number): Orientacion {
  const r = ancho / alto
  if (r > 1.25) return 'horizontal'
  if (r < 0.8) return 'vertical'
  return 'cuadrado'
}

export function etiquetaFormato(f: { ancho: number; alto: number }): string {
  return `${f.ancho} × ${f.alto}`
}
