/** Modelo de datos compartido entre el cliente y las funciones de Cloudflare. */

export type Rol = 'admin' | 'usuario'

export interface Usuario {
  id: string
  email: string
  /** Nombre de usuario alternativo: se puede entrar con esto o con el correo. */
  usuario?: string
  nombre: string
  rol: Rol
  activo: boolean
  correoContacto?: string
  zonaHoraria: string
  creadoEn: string
}

export type Canal = 'search' | 'display' | 'meta'

export interface LogoMarca {
  id: string
  nombre: string
  src: string
  /** Versión pensada para fondos claros u oscuros. */
  variante: 'color' | 'blanco'
}

export interface Marca {
  id: string
  nombre: string
  propietarioId: string | null
  esSistema: boolean
  descripcion?: string
  colores: string[]
  colorTexto: string
  logos: LogoMarca[]
  tipografia: { titulo: string; cuerpo: string }
  radio: number
  creadoEn: string
  actualizadoEn: string
}

export type PresetFiltro =
  | 'ninguno'
  | 'blanco_negro'
  | 'oscurecer'
  | 'aclarar'
  | 'contraste'
  | 'calido'
  | 'frio'
  | 'desenfoque'
  | 'tinte_marca'

export interface Fondo {
  tipo: 'color' | 'imagen'
  color: string
  imagenId?: string
  imagenSrc?: string
  ajuste: 'cover' | 'contain'
  /** Encuadre relativo de la foto dentro del banner (0–1). */
  foco: { x: number; y: number }
  filtro: { preset: PresetFiltro; intensidad: number; color?: string }
}

export interface Enlace {
  url: string
  destino: '_blank' | '_self'
}

interface ElementoBase {
  id: string
  nombre: string
  x: number
  y: number
  w: number
  h: number
  z: number
  bloqueado?: boolean
  enlace?: Enlace
}

export interface ElementoForma extends ElementoBase {
  tipo: 'rectangulo' | 'circulo'
  relleno: string
  borde: string
  grosorBorde: number
  radio: number
}

export type AlineacionTexto = 'izquierda' | 'centro' | 'derecha'

export interface ElementoTexto extends ElementoBase {
  tipo: 'texto'
  texto: string
  color: string
  fuente: string
  tamano: number
  peso: 400 | 500 | 600 | 700
  alineacion: AlineacionTexto
  alineacionVertical: 'arriba' | 'centro' | 'abajo'
  interlineado: number
  margen: { arriba: number; derecha: number; abajo: number; izquierda: number }
  fondo?: string
  radio: number
  /** Reduce el cuerpo automáticamente hasta que el texto entra en la caja. */
  autoAjuste: boolean
}

export interface ElementoImagen extends ElementoBase {
  tipo: 'imagen' | 'logo'
  src: string
  imagenId?: string
  ajuste: 'contain' | 'cover'
  radio: number
}

export type Elemento = ElementoForma | ElementoTexto | ElementoImagen

export interface Banner {
  formatoId: string
  ancho: number
  alto: number
  /** Marcado para vista previa y exportación. */
  seleccionado: boolean
  /** El banner base (300x250) es el origen de la replicación. */
  base: boolean
  /** El usuario editó este formato después de replicar. */
  ajustadoManualmente: boolean
  fondo: Fondo
  elementos: Elemento[]
  enlace: Enlace
}

export interface DisenoProyecto {
  marcaId: string | null
  /** Estilo libre: la campaña no usa una marca guardada. */
  estiloLibre: boolean
  banners: Banner[]
}

export interface BriefSearch {
  tiposAnuncio: string[]
  accionCta: string
  ganchoOferta: string
  destinoCta: string
  urlReferencia1: string
  urlReferencia2: string
  imagenes: { id: string; nombre: string; src: string }[]
  indicaciones: string
}

export interface TituloSearch {
  texto: string
}

export interface GrupoAnuncios {
  nombre: string
  tema: string
  titulos: string[]
  descripciones: string[]
  rutas: string[]
  palabrasClave: { amplia: string[]; frase: string[]; exacta: string[] }
}

export interface ResultadoSearch {
  generadoEn: string
  modelo: string
  resumen: {
    producto: string
    propuestaValor: string
    publico: string
    competencia: string[]
    aprendizajes: string[]
  }
  grupos: GrupoAnuncios[]
  palabrasNegativas: string[]
  extensiones: {
    sitelinks: { titulo: string; descripcion1: string; descripcion2: string; url: string }[]
    textosDestacados: string[]
    fragmentos: { encabezado: string; valores: string[] }[]
  }
  recomendaciones: string[]
  fuentesLeidas: { url: string; estado: string; caracteres: number }[]
}

export type EstadoProyecto = 'en_curso' | 'realizado'

export interface Proyecto {
  id: string
  nombre: string
  propietarioId: string
  canales: Canal[]
  estado: EstadoProyecto
  marcaId: string | null
  brief?: BriefSearch
  resultadoSearch?: ResultadoSearch
  diseno?: DisenoProyecto
  creadoEn: string
  actualizadoEn: string
}

export type TipoEvento =
  | 'proyecto_creado'
  | 'proyecto_actualizado'
  | 'proyecto_cerrado'
  | 'proyecto_reabierto'
  | 'search_generado'
  | 'banner_guardado'
  | 'banners_replicados'
  | 'exportacion'
  | 'imagen_subida'
  | 'marca_creada'
  | 'usuario_creado'
  | 'sesion_iniciada'

export interface EventoHistorial {
  id: string
  usuarioId: string
  usuarioEmail: string
  proyectoId?: string
  proyectoNombre?: string
  tipo: TipoEvento
  detalle: string
  formato?: string
  creadoEn: string
}

export interface ImagenBiblioteca {
  id: string
  nombre: string
  src: string
  ancho: number
  alto: number
  peso: number
  propietarioId: string | null
  origen: 'cloudflare' | 'usuario' | 'proyecto'
  etiquetas: string[]
  creadoEn: string
}

export interface Ajustes {
  /** Modelo de Gemini configurado para Char B. */
  modeloIa: string
  /** Clave personal para operar sin backend (sólo se guarda en el navegador). */
  claveIaLocal?: string
  zonaHoraria: string
}
