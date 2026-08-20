/**
 * Familia única de iconografía del aplicativo: trazo de 1.75, extremos y uniones
 * redondeados, cuadrícula de 24. No se mezclan estilos ni se usan emojis.
 */

const TRAZOS: Record<string, string> = {
  campana: 'M4 9v6h3l5 3V6L7 9H4Z M16 9a4 4 0 0 1 0 6 M19 6a8 8 0 0 1 0 12',
  buscar: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z M20 20l-4-4',
  display: 'M3 5h18v10H3z M8 19h8 M12 15v4',
  meta: 'M4 12c0-3 1.6-5 3.6-5 2.8 0 4 4.4 6.4 4.4 1.6 0 2.4-1.2 2.4-2.6 0-2-1.2-3.4-2.8-3.4 M20 12c0 3-1.6 5-3.6 5-2.8 0-4-4.4-6.4-4.4-1.6 0-2.4 1.2-2.4 2.6 0 2 1.2 3.4 2.8 3.4',
  proyectos: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
  realizados: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z M8.5 12.5l2.5 2.5 4.5-5',
  marcas: 'M4 11V5a1 1 0 0 1 1-1h6l8.5 8.5a1.5 1.5 0 0 1 0 2.1l-5.9 5.9a1.5 1.5 0 0 1-2.1 0L4 12Z M8 8h.01',
  biblioteca: 'M3 5h18v14H3z M3 15l4.5-4.5 4 4L15 11l6 6',
  historial: 'M12 4a8 8 0 1 0 8 8 M12 4V2 M12 7v5l3.5 2.5 M4.5 7.5 3 6',
  configuracion:
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z M12 2.5l1.4 2.3 2.6-.5.6 2.6 2.4 1.1-1.2 2.4 1.2 2.4-2.4 1.1-.6 2.6-2.6-.5L12 21.5l-1.4-2.3-2.6.5-.6-2.6-2.4-1.1L6.2 13.5 5 11.1l2.4-1.1.6-2.6 2.6.5Z',
  usuarios:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5 M16.5 5.2a3.2 3.2 0 0 1 0 6.1 M18 14.6c2.2.6 3.5 2.2 3.5 4.4',
  salir: 'M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8 M17 8l4 4-4 4 M9 12h12',
  mas: 'M12 5v14 M5 12h14',
  guardar: 'M5 4h11l4 4v12H5z M8 4v6h8V4 M8 20v-6h8v6',
  exportar: 'M12 3v12 M8 11l4 4 4-4 M4 19h16',
  subir: 'M12 20V8 M8 12l4-4 4 4 M4 4h16',
  replicar: 'M9 3h11v11 M4 8h11v13H4z',
  texto: 'M5 6V4h14v2 M12 4v16 M9 20h6',
  cuadrado: 'M5 5h14v14H5z',
  circulo: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z',
  rectangulo: 'M3 8h18v8H3z',
  imagen: 'M4 5h16v14H4z M4 16l4.5-4.5 3.5 3.5 3-3L20 16 M9 9.5h.01',
  logo: 'M4 6h16v12H4z M8 14l2.5-3 2 2.5 2-2.5L18 14',
  basura: 'M4 7h16 M9 7V5h6v2 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
  deshacer: 'M9 10H5V6 M5 10a8 8 0 1 1 1.6 6.4',
  rehacer: 'M15 10h4V6 M19 10a8 8 0 1 0-1.6 6.4',
  contraer: 'M14 6l-6 6 6 6 M20 4v16',
  expandir: 'M10 6l6 6-6 6 M4 4v16',
  ojo: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  cerrar: 'M6 6l12 12 M18 6 6 18',
  izquierda: 'M14 5l-7 7 7 7',
  derecha: 'M10 5l7 7-7 7',
  abajo: 'M5 9l7 7 7-7',
  arriba: 'M5 15l7-7 7 7',
  adelante: 'M4 8h10v10H4z M10 4h10v10',
  atras: 'M10 6h10v10H10z M4 4h10v10H4z',
  enlace: 'M10 13a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7L11.5 5.8 M14 11a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.5-1.5',
  filtro: 'M4 5h16 M7 12h10 M10 19h4',
  alerta: 'M12 4 2.5 20h19L12 4Z M12 10v4 M12 17h.01',
  check: 'M5 12.5 10 17.5 19 7',
  info: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z M12 11v5 M12 8h.01',
  error: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z M9 9l6 6 M15 9l-6 6',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  ia: 'M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z M18 16l.9 2.1 2.1.9-2.1.9L18 22l-.9-2.1-2.1-.9 2.1-.9L18 16Z',
  copiar: 'M8 8h12v12H8z M4 16V4h12',
  capas: 'M12 3 3 8l9 5 9-5-9-5Z M3 13l9 5 9-5 M3 17.5l9 5 9-5',
  mover: 'M12 3v18 M3 12h18 M9 6l3-3 3 3 M9 18l3 3 3-3 M6 9l-3 3 3 3 M18 9l3 3-3 3',
  marca: 'M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8L12 3Z',
}

export type NombreIcono = keyof typeof TRAZOS

interface Props {
  nombre: NombreIcono
  tamano?: number
  className?: string
  titulo?: string
}

export function Icono({ nombre, tamano = 20, className, titulo }: Props) {
  const d = TRAZOS[nombre]
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={titulo ? 'img' : 'presentation'}
      aria-hidden={titulo ? undefined : true}
      aria-label={titulo}
      focusable="false"
    >
      {titulo ? <title>{titulo}</title> : null}
      {d.split(' M').map((parte, i) => (
        <path key={i} d={i === 0 ? parte : `M${parte}`} />
      ))}
    </svg>
  )
}
