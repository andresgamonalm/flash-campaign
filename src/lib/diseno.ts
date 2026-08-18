import type {
  Banner,
  Canal,
  DisenoProyecto,
  Elemento,
  ElementoForma,
  ElementoImagen,
  ElementoTexto,
  Fondo,
  Marca,
} from './types'
import { FORMATO_BASE, formatosDeCanales, type Formato } from './formatos'
import { replicarBanner } from './replicar'
import { textoLegibleSobre } from './contraste'

/** Fábricas de elementos y armado inicial de la campaña gráfica. */

export function fondoInicial(marca: Marca | null): Fondo {
  return {
    tipo: 'color',
    color: marca?.colores[0] ?? '#FFFFFF',
    ajuste: 'cover',
    foco: { x: 0.5, y: 0.5 },
    filtro: { preset: 'ninguno', intensidad: 40, color: marca?.colores[0] ?? '#040764' },
  }
}

export function bannerVacio(formato: Formato, marca: Marca | null): Banner {
  return {
    formatoId: formato.id,
    ancho: formato.ancho,
    alto: formato.alto,
    seleccionado: true,
    base: Boolean(formato.base),
    ajustadoManualmente: false,
    fondo: fondoInicial(marca),
    elementos: [],
    enlace: { url: '', destino: '_blank' },
  }
}

export function disenoInicial(canales: Canal[], marca: Marca | null, estiloLibre: boolean): DisenoProyecto {
  const formatos = formatosDeCanales(canales)
  return {
    marcaId: estiloLibre ? null : (marca?.id ?? null),
    estiloLibre,
    // Al iniciar, todos los formatos nacen en blanco: el trabajo empieza en el
    // lienzo base y desde ahí se replica.
    banners: formatos.map((f) => bannerVacio(f, marca)),
  }
}

export function bannerBase(diseno: DisenoProyecto): Banner | undefined {
  return diseno.banners.find((b) => b.base) ?? diseno.banners.find((b) => b.formatoId === FORMATO_BASE.id)
}

/** Replica el lienzo base al resto de formatos respetando los ajustes manuales. */
export function replicarDiseno(
  diseno: DisenoProyecto,
  opciones: { sobrescribirManuales: boolean } = { sobrescribirManuales: false },
): { diseno: DisenoProyecto; replicados: number; conservados: number } {
  const base = bannerBase(diseno)
  if (!base) return { diseno, replicados: 0, conservados: 0 }

  let replicados = 0
  let conservados = 0

  const banners = diseno.banners.map((banner) => {
    if (banner.base) return banner
    if (banner.ajustadoManualmente && !opciones.sobrescribirManuales) {
      conservados += 1
      return banner
    }
    replicados += 1
    return replicarBanner(base, { id: banner.formatoId, nombre: '', ancho: banner.ancho, alto: banner.alto, canal: 'display' }, banner)
  })

  return { diseno: { ...diseno, banners }, replicados, conservados }
}

let contadorElementos = 0

function nuevoId(prefijo: string): string {
  contadorElementos += 1
  return `${prefijo}_${Date.now().toString(36)}_${contadorElementos}`
}

function zSuperior(elementos: Elemento[]): number {
  return elementos.reduce((max, el) => Math.max(max, el.z), 0) + 1
}

export function crearRectangulo(banner: Banner, marca: Marca | null): ElementoForma {
  const ancho = Math.round(banner.ancho * 0.6)
  const alto = Math.round(banner.alto * 0.2)
  return {
    id: nuevoId('rect'),
    nombre: 'Rectángulo',
    tipo: 'rectangulo',
    x: Math.round((banner.ancho - ancho) / 2),
    y: Math.round((banner.alto - alto) / 2),
    w: ancho,
    h: alto,
    z: zSuperior(banner.elementos),
    relleno: marca?.colores[1] ?? '#1C73CB',
    borde: marca?.colores[0] ?? '#040764',
    grosorBorde: 0,
    radio: 8,
  }
}

export function crearCirculo(banner: Banner, marca: Marca | null): ElementoForma {
  const lado = Math.round(Math.min(banner.ancho, banner.alto) * 0.45)
  return {
    id: nuevoId('circ'),
    nombre: 'Círculo',
    tipo: 'circulo',
    x: Math.round((banner.ancho - lado) / 2),
    y: Math.round((banner.alto - lado) / 2),
    w: lado,
    h: lado,
    z: zSuperior(banner.elementos),
    relleno: marca?.colores[2] ?? '#20B6B6',
    borde: marca?.colores[0] ?? '#040764',
    grosorBorde: 0,
    radio: 0,
  }
}

export function crearCuadrado(banner: Banner, marca: Marca | null): ElementoForma {
  const lado = Math.round(Math.min(banner.ancho, banner.alto) * 0.35)
  return {
    ...crearRectangulo(banner, marca),
    tipo: 'rectangulo',
    id: nuevoId('cuad'),
    nombre: 'Cuadrado',
    w: lado,
    h: lado,
    x: Math.round((banner.ancho - lado) / 2),
    y: Math.round((banner.alto - lado) / 2),
  }
}

export function crearTexto(banner: Banner, marca: Marca | null, texto = 'Escribe aquí'): ElementoTexto {
  const ancho = Math.round(banner.ancho * 0.8)
  const tamano = Math.max(12, Math.round(Math.min(banner.ancho, banner.alto) * 0.09))
  return {
    id: nuevoId('txt'),
    nombre: 'Texto',
    tipo: 'texto',
    x: Math.round((banner.ancho - ancho) / 2),
    y: Math.round(banner.alto * 0.35),
    w: ancho,
    h: Math.round(tamano * 2.4),
    z: zSuperior(banner.elementos),
    texto,
    color: marca?.colorTexto ?? '#FFFFFF',
    fuente: marca?.tipografia.titulo ?? 'Arial',
    tamano,
    peso: 600,
    alineacion: 'izquierda',
    alineacionVertical: 'centro',
    interlineado: 1.15,
    margen: { arriba: 4, derecha: 6, abajo: 4, izquierda: 6 },
    radio: 8,
    autoAjuste: true,
  }
}

export function crearCta(banner: Banner, marca: Marca | null): Elemento[] {
  const relleno = marca?.colores[8] ?? '#FCE865'
  const ancho = Math.round(banner.ancho * 0.52)
  const alto = Math.round(Math.max(24, banner.alto * 0.16))
  const x = Math.round(banner.ancho * 0.08)
  const y = Math.round(banner.alto - alto - banner.alto * 0.08)
  const z = zSuperior(banner.elementos)
  const fondo: ElementoForma = {
    id: nuevoId('cta'),
    nombre: 'Botón CTA',
    tipo: 'rectangulo',
    x,
    y,
    w: ancho,
    h: alto,
    z,
    relleno,
    borde: '#FFFFFF',
    grosorBorde: 0,
    radio: Math.round(alto / 2),
  }
  const etiqueta: ElementoTexto = {
    ...crearTexto(banner, marca, 'Cotiza aquí'),
    id: nuevoId('ctatxt'),
    nombre: 'Texto del CTA',
    x,
    y,
    w: ancho,
    h: alto,
    z: z + 1,
    tamano: Math.max(10, Math.round(alto * 0.42)),
    // El texto del CTA nunca queda ilegible: se elige por contraste sobre el relleno.
    color: textoLegibleSobre(relleno),
    alineacion: 'centro',
    alineacionVertical: 'centro',
    peso: 600,
    margen: { arriba: 2, derecha: 8, abajo: 2, izquierda: 8 },
  }
  return [fondo, etiqueta]
}

export function crearImagen(
  banner: Banner,
  src: string,
  nombre: string,
  medidas?: { ancho: number; alto: number },
): ElementoImagen {
  const proporcion = medidas && medidas.alto ? medidas.ancho / medidas.alto : 1
  const ancho = Math.round(banner.ancho * 0.45)
  return {
    id: nuevoId('img'),
    nombre,
    tipo: 'imagen',
    x: Math.round(banner.ancho * 0.05),
    y: Math.round(banner.alto * 0.1),
    w: ancho,
    h: Math.round(ancho / (proporcion || 1)),
    z: zSuperior(banner.elementos),
    src,
    ajuste: 'contain',
    radio: 0,
  }
}

export function crearLogo(banner: Banner, src: string, nombre = 'Logo'): ElementoImagen {
  const ancho = Math.round(banner.ancho * 0.38)
  return {
    id: nuevoId('logo'),
    nombre,
    tipo: 'logo',
    x: Math.round(banner.ancho * 0.06),
    y: Math.round(banner.alto * 0.06),
    w: ancho,
    h: Math.round(ancho * 0.24),
    z: zSuperior(banner.elementos),
    src,
    ajuste: 'contain',
    radio: 0,
  }
}

export function duplicarElemento(el: Elemento, banner: Banner): Elemento {
  return {
    ...el,
    id: nuevoId('dup'),
    nombre: `${el.nombre} (copia)`,
    x: Math.min(el.x + 12, banner.ancho - 12),
    y: Math.min(el.y + 12, banner.alto - 12),
    z: zSuperior(banner.elementos),
  }
}
