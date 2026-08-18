/** Formateadores de fecha, peso y números con locale chileno. */

export function fecha(iso: string, zonaHoraria?: string): string {
  try {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: zonaHoraria || undefined,
    }).format(new Date(iso))
  } catch {
    return new Date(iso).toLocaleString('es-CL')
  }
}

export function fechaCorta(iso: string, zonaHoraria?: string): string {
  try {
    return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: zonaHoraria || undefined }).format(
      new Date(iso),
    )
  } catch {
    return new Date(iso).toLocaleDateString('es-CL')
  }
}

export function peso(bytes: number): string {
  if (!bytes) return '—'
  const unidades = ['B', 'KB', 'MB', 'GB']
  let valor = bytes
  let i = 0
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024
    i += 1
  }
  return `${valor.toFixed(valor >= 10 || i === 0 ? 0 : 1)} ${unidades[i]}`
}

export const ZONAS_HORARIAS = [
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/Lima',
  'America/Bogota',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/Madrid',
  'UTC',
]
