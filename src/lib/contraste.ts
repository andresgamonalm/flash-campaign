/** Utilidades de contraste WCAG para elegir texto legible sobre cualquier color. */

const NEGRO = '#1A1A1A'
const BLANCO = '#FFFFFF'

export function aRgb(hex: string): [number, number, number] | null {
  const limpio = hex.trim().replace('#', '')
  const completo = limpio.length === 3 ? limpio.split('').map((c) => c + c).join('') : limpio
  if (!/^[0-9a-fA-F]{6}$/.test(completo)) return null
  return [
    parseInt(completo.slice(0, 2), 16),
    parseInt(completo.slice(2, 4), 16),
    parseInt(completo.slice(4, 6), 16),
  ]
}

function canal(v: number): number {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function luminancia(hex: string): number {
  const rgb = aRgb(hex)
  if (!rgb) return 1
  const [r, g, b] = rgb.map(canal)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function razonContraste(a: string, b: string): number {
  const la = luminancia(a)
  const lb = luminancia(b)
  const claro = Math.max(la, lb)
  const oscuro = Math.min(la, lb)
  return (claro + 0.05) / (oscuro + 0.05)
}

/** Devuelve blanco o casi negro, el que mejor contraste consiga sobre el fondo. */
export function textoLegibleSobre(fondo: string): string {
  return razonContraste(fondo, BLANCO) >= razonContraste(fondo, NEGRO) ? BLANCO : NEGRO
}

export function cumpleAA(texto: string, fondo: string, grande = false): boolean {
  return razonContraste(texto, fondo) >= (grande ? 3 : 4.5)
}
