# Manual de marca Zurich — guía de trabajo

Documento de traspaso para otra sesión de Claude u otro equipo.

**Fuente:** `Info-Zurich/Manual-Marca/Brandbook Zurich 2024.pdf` (14 páginas), incluido en
el repositorio `andresgamonalm/flash-campaign`. Todo lo marcado como **[Brandbook]**
está tomado literalmente de ese documento. Todo lo marcado como **[Convención]** es una
decisión de trabajo de este proyecto, no doctrina de Zurich: se puede discutir y cambiar.

**Uso previsto:** documentos de texto, presentaciones y desarrollos formales. No es una
guía para piezas creativas ni publicitarias; para eso manda el brandbook completo.

---

## 1. Antes de nada: la regla de oro

**[Brandbook]** La identidad de marca es el conjunto de componentes visuales que
representan los valores y el propósito de la empresa: logotipo, tipografía, colores y el
diseño de todos los materiales.

**[Brandbook]** *«Interno vs externo: ¡No hay diferencia!»* Un documento interno se hace
con el mismo cuidado que uno que ve un cliente.

---

## 2. Logotipo

**[Brandbook]** El logotipo es la base visual de toda la marca. Existen tres formas:

| Forma | Descripción | Cuándo usarla |
|---|---|---|
| **Horizontal** | La Z sonriente junto a la marca denominativa «Zurich». Construido para mantener peso, equilibrio y alineación entre ambos elementos. | Opción por defecto en documentos y presentaciones. |
| **Vertical** | La Z sonriente centrada sobre la marca denominativa, con las mismas proporciones. | Cuando el espacio es más alto que ancho. |
| **Z sonriente** (isotipo) | La Z sola. | Sólo en casos concretos. |

**[Brandbook]** Regla dura sobre la Z sola:

> «Tenga en cuenta que la Z sonriente se puede usar sola en ciertos casos, pero el
> logotipo de Zúrich **solo se completa con la marca denominativa acompañada de la Z
> sonriente**.»

En un documento formal, portada y cabecera llevan el logotipo completo. La Z sola queda
para favicon, viñeta o marca de agua.

**[Convención]** El brandbook **no fija una medida numérica de área de resguardo**. Como
regla de trabajo, deja libre a cada lado del logotipo un margen igual a **la altura de la Z**.
Es la convención habitual y evita que el logotipo quede pegado a un borde o a un texto.

---

## 3. Colores

### 3.1 Paleta de marca — la que se usa en documentos formales

**[Brandbook]** Uso: *«Representación de la marca. Visibilidad coherente en todas las
comunicaciones de la marca.»*

| Nombre | HEX | RGB | CMYK | PMS |
|---|---|---|---|---|
| **Azul de Zúrich** (color héroe) | `#2167AE` | 33, 103, 174 | 90, 48, 0, 0 | 300 C |
| Azul oscuro | `#23366F` | 35, 54, 111 | 100, 85, 0, 39 | 289 C |
| Azul medio | `#5495CF` | 84, 149, 207 | 67, 34, 0, 0 | 279 C |
| Azul claro | `#91BFE3` | 145, 191, 227 | 32, 8, 0, 0 | 277 C |
| Celeste | `#1FB1E6` | 31, 177, 230 | 58, 0, 0, 0 | 2985 C |
| Piedra arenisca | `#DAD2BD` | 218, 210, 189 | 12, 10, 28, 0 | 7527 C |
| Paloma | `#DDE4E3` | 221, 228, 227 | 5, 0, 3, 0 | 7541 C |
| Blanco de Zúrich | `#ECEEEF` | 236, 238, 239 | — **sólo pantalla** | — |

**[Brandbook]** El **Azul de Zúrich `#2167AE` es el color héroe** y *«debe usarse con una
visibilidad constante en todas las comunicaciones de la marca»*.

**[Brandbook]** *Blanco de Zúrich* está marcado **SOLO PANTALLA**: no usarlo en impresión.

### 3.2 Paleta secundaria — acentos, con moderación

**[Brandbook]** Uso: *«Como colores de acento para complementar la paleta de la marca.
Para resaltar un detalle o tema específico. Pueden ser un color de fondo cuando hay un
pictograma o texto en el círculo más grande (en lugar de una imagen).»*

| Nombre | HEX | PMS |
|---|---|---|
| Celeste (secundario) | `#4870C6` | 2172 C |
| Musgo | `#77A984` | 556 C |
| Cerceta | `#19BAB6` | 2397 C |
| Menta | `#A6E9AB` | 352 C |
| Lima | `#FFF773` | 602 C |
| Limón | `#FFF773` | 602 C |
| Durazno | `#FF7569` | 2345 C |
| Caramelo | `#E18EBA` | 237 C |
| Rosa empolvado | `#FFC5EA` | 496 C |
| Lila | `#6D6BCF` | 2096 C |

> **Aviso de fidelidad:** en la página 5 del brandbook, *Lima* y *Limón* figuran con el
> mismo valor (`#FFF773`, PMS 602 C). Puede ser una errata del documento original.
> Antes de usar uno de los dos en una pieza oficial, confírmalo con la marca.

**[Brandbook]** Lo que **no** se debe hacer con la paleta secundaria:

> «No se utilizan como color de fondo completo si hay una imagen; en ese caso se debe
> utilizar un color de marca o un color inclusivo.»

### 3.3 Color inclusivo

**[Brandbook]** Es el método para elegir un color de fondo que trabaje en armonía con una
fotografía o un vídeo:

- el color elegido debe ser claramente visible en la imagen;
- **evita los tonos de piel y cabello**.

**[Convención]** En este proyecto se han usado como colores inclusivos, tomados de piezas
reales de campaña: `#C44693` (Auto Digital), `#F16F6D` (1 cuota gratis) y `#E4B273`
(SOAPcheck). Están en `src/lib/marcas.ts`.

---

## 4. Tipografía

**[Brandbook]** Jerarquía de fuentes:

1. **Zurich Sans** — fuente principal, *«la fuente en la que escribimos»*. Cinco pesos.
   Sirve para titulares, cuerpo de texto y todo lo demás. Viene con interlineado,
   interletraje y seguimiento personalizados: **en aplicaciones estándar no hay que
   ajustar nada**.
2. **Ogg** — segunda fuente, sólo para resaltar.
3. **Arial** — la opción cuando Zurich Sans no está disponible.

**[Brandbook]** Cuándo toca Arial, literal:

> «La fuente Arial debe usarse en casos en los que Zurich Sans sea difícil de obtener,
> compartir o usar. Si utilizas una aplicación que no admite fuentes personalizadas, o
> envías una presentación externamente a alguien que no tiene acceso a Zurich Sans.»

**Para documentos y presentaciones esto importa mucho:** si el archivo va a salir de la
organización, o se va a abrir en Word, Google Docs o PowerPoint sin la fuente instalada,
**usa Arial**. Es lo que dice el manual, no un apaño.

### Ogg: reglas estrictas

**[Brandbook]** Ogg es una tipografía caligráfica, exclusiva de titulares. Es *«el enfoque
de Zurich de lo que sería un subrayado, cursiva o negrita»*.

- Úsala **una sola vez en el mismo espacio** (al principio, al centro o al final de un título).
- **No** usar Ogg sola o de forma aislada.
- **No** escribir el titular entero en Ogg: sólo de **1 a 3 palabras**.
- **No** usar Ogg en sublíneas ni en cuerpo de texto.
- **No** escribir «Zúrich» en Ogg.

**[Convención]** En un documento formal (informe, memo, propuesta) lo más seguro es **no
usar Ogg**. Es un recurso expresivo y aquí no aporta.

---

## 5. Lenguaje de formas

**[Brandbook]** Las formas dan composiciones variadas y dinámicas, alojan la fotografía y
la Z sonriente, y ponen el sello de Zurich.

**Formas de puesta a tierra:** *«Para crear una sensación de apoyo y estabilidad, el
lenguaje de formas debe parecer estar en la parte inferior de la página, construyéndose.»*
En web o en pantallas con desplazamiento, donde los bordes no son accesibles, ancla las
formas a otros elementos: divisores de sección, botones, etc.

**[Brandbook]** Lo que **no** se debe hacer:

- no usar los mismos colores uno al lado del otro;
- no usar **menos de tres** formas;
- no usar sólo círculos, ni sólo semicírculos;
- no usar todas las formas a la misma escala;
- no dejar composiciones «colgando»: siempre conectadas a la tierra;
- no superponer las formas;
- no dejar formas flotando.

**[Convención]** En documentos de texto y presentaciones formales, el lenguaje de formas
se usa con mucha contención: como banda inferior de una portada o de una separata, y poco
más. No metas formas en páginas de contenido.

---

## 6. Fotografía

**[Brandbook]** El principio central, literal:

> «¿Podría ser una foto en el carrete de la cámara de su teléfono? Si no es así, no lo uses.»

Las imágenes deben ser **naturales, no excesivamente estilizadas ni posadas**; alcanzables
y realistas. Tres palabras que resumen el tono: **humano, optimista, comprometido**.

- **Casting:** personas que parezcan amigos, vecinos, colegas — no modelos profesionales.
  Vestuario, peinado y maquillaje auténticos. Debe reflejar diversidad.
- **Composición:** sujeto claro, foco evidente. Usar el espacio negativo para guiar el ojo.
  Composición simple.
- **Iluminación y color:** luz natural, sin luces ni sombras fuertes, blancos equilibrados.
  Paleta de color simple.
- **Objetos:** simples y gráficos, perfiles marcados.

**[Brandbook]** Lo que **no** se debe hacer:

- evitar imágenes que parezcan fotografía de archivo;
- nada de fotos grupales posadas;
- nada de poses poco realistas;
- nada de imágenes corporativas de la vieja escuela;
- **evitar superposiciones gráficas**;
- evitar destellos de lente, primeros planos desenfocados, colores y filtros de posproceso;
- en desastres naturales: mostrar acción, ayuda y esperanza, no sólo el drama.

---

## 7. Ilustraciones e íconos

**[Brandbook] Ilustraciones.** Aspecto coherente mediante los colores de la marca y un
sistema de cuadrículas sólidas, con formas geométricas y orgánicas. Parten de la forma del
logotipo y del lenguaje de formas: formas simples y líneas limpias.
**La paleta de marca es la opción predeterminada**; sólo en circunstancias especiales, y
donde un color secundario sea el tema, se usa la paleta secundaria.

**[Brandbook] Íconos.** Comunican rápido y sirven de atajo visual. Cada ícono viene en dos
estados, **delineado y relleno**, para los estados encendido/apagado en entornos digitales.

> «Las versiones **rellenas** también deben usarse a **pequeña escala**, y las versiones
> **delineadas** a **gran escala**, como letreros o vallas publicitarias.»

---

## 8. Espacio Seguro (Smiling Z flexible)

**[Brandbook]** La Z sonriente tiene un comportamiento flexible llamado «Espacio Seguro».
Disponible en versión estática (impreso y digital fijo) y animada (digital en movimiento).
Al ser flexible admite cualquier tamaño; para formatos estáticos hay cuatro tamaños
predefinidos según la altura de la Z.

Sí se debe:

- una pequeña superposición que cree relación positiva con el tema;
- usar espacio negativo para un espacio seguro dinámico;
- un fondo textual que se adapte a la visibilidad del dispositivo;
- lo simple y lo icónico siempre es buena opción.

**[Brandbook]** No se debe:

- que la Z **obstaculice directamente un retrato**;
- que la Z se interponga en la historia de la imagen;
- que patrones y formas interrumpan la visibilidad de la Z.

---

## 9. Co-branding

**[Brandbook]** Muestra una relación comercial con terceros **como co-iguales**.

- Los logotipos van **a la misma altura**.
- Separación suficiente para que no parezca un solo logotipo, pero cercana para que se lea
  como asociación.
- Si el logotipo del tercero es sólo tipográfico, se empareja su altura con la altura de la
  **marca denominativa** de Zúrich (no con la Z).
- **Línea divisoria:** no siempre necesaria; ayuda a unir los logotipos. Queda a criterio
  del diseñador.
- **Colocación, regla dura:** *«En cualquier formato, horizontal o vertical, impreso o
  digital, el bloqueo de marca compartida siempre se coloca en la esquina superior
  izquierda.»* Aplica a bloqueos horizontales y verticales.
- En co-branding se aplican **las reglas normales** de identidad visual de Zurich.

---

## 10. Dónde están los archivos

Todo lo siguiente está en el repositorio **`andresgamonalm/flash-campaign`**, rama `main`.

### Logotipos listos para usar

| Archivo | Medidas | Fondo para el que sirve |
|---|---|---|
| `public/brand/zurich/zurich_logo_horizontal.png` | 2826 × 656 px, PNG con transparencia | Fondos claros |
| `public/brand/zurich/zurich_logo_horizontal_blanco.png` | 2826 × 656 px, PNG con transparencia | Fondos oscuros |
| `public/brand/zurich/zurich_isotipo.png` | 1500 × 1455 px, PNG con transparencia | Sólo la Z, fondos claros |
| `public/brand/zurich/zurich_isotipo_blanco.png` | 1500 × 1455 px, PNG con transparencia | Sólo la Z, fondos oscuros |

Proporción del logotipo horizontal: **4,31 : 1**. Proporción del isotipo: **1,03 : 1**
(casi cuadrado, no lo fuerces a cuadrado exacto).

### Otros materiales

| Ruta | Contenido |
|---|---|
| `Info-Zurich/Manual-Marca/Brandbook Zurich 2024.pdf` | El manual completo, 14 páginas. Fuente de todo este documento. |
| `Info-Zurich/Referencias-GADS/1-Ref-Zurich.png` … `10-Ref-Zurich.png` | Diez piezas publicitarias reales de Zurich Chile: Auto Digital, Celular Protegido, SOAPcheck, Vida con Ahorro. Útiles para ver la marca aplicada. |
| `public/biblioteca/zurich-referencias/` | Las mismas diez referencias, servidas por el aplicativo. |
| `src/lib/marcas.ts` | La marca Zurich ya definida en código: paleta, logotipos y tipografía. |

---

## 11. EXTRA — Especificación de cabecera (header)

**[Convención]** Esto **no** está en el brandbook: es una especificación de trabajo,
derivada de sus reglas, para documentos de texto, presentaciones y desarrollos formales.
Fundamento: el Azul de Zúrich es el color héroe y debe tener visibilidad constante; el
logotipo se usa completo; y en co-branding el bloqueo va arriba a la izquierda, así que la
esquina superior izquierda es el lugar natural del logotipo.

### Versión principal — fondo azul, logotipo blanco

Es la que se usa por defecto. Da presencia al color héroe.

| Propiedad | Valor |
|---|---|
| Fondo | `#2167AE` (Azul de Zúrich) |
| Logotipo | `zurich_logo_horizontal_blanco.png` |
| Posición del logotipo | Alineado a la izquierda |
| Texto sobre el fondo, si lo hay | Blanco `#FFFFFF` |
| Contraste blanco sobre `#2167AE` | **5,81 : 1** — cumple WCAG AA para texto normal |

### Versión secundaria — fondo blanco, logotipo azul

Para documentos de muchas páginas, informes densos o cuando la cabecera se repite en cada
hoja y el azul plano cansaría.

| Propiedad | Valor |
|---|---|
| Fondo | `#FFFFFF` |
| Logotipo | `zurich_logo_horizontal.png` |
| Filete inferior | 2 px sólidos en `#2167AE`, para que la cabecera no se confunda con el contenido |
| Texto sobre el fondo, si lo hay | `#23366F` (Azul oscuro) |
| Contraste `#23366F` sobre blanco | **11,48 : 1** — cumple WCAG AAA |

### Medidas recomendadas

| Soporte | Alto de cabecera | Alto del logotipo | Margen izquierdo |
|---|---|---|---|
| Documento A4 | 28 mm | 12 mm (≈ 52 mm de ancho) | 20 mm |
| Presentación 16:9 (1920 × 1080) | 120 px | 52 px (≈ 224 px de ancho) | 80 px |
| Web / aplicativo | 72 px | 32 px (≈ 138 px de ancho) | 24 px |

El ancho del logotipo sale de multiplicar su alto por **4,31**. No lo estires ni lo
comprimas: escala siempre proporcional.

### Implementación en HTML y CSS

```css
:root {
  --zurich-azul: #2167ae;        /* color héroe */
  --zurich-azul-oscuro: #23366f;
}

/* Versión principal: fondo azul, logotipo blanco */
.zurich-header {
  display: flex;
  align-items: center;
  gap: 24px;
  height: 72px;
  padding: 0 24px;
  background: var(--zurich-azul);
  color: #ffffff;
}

.zurich-header__logo {
  height: 32px;      /* el ancho lo calcula el navegador con la proporción real */
  width: auto;
  display: block;
}

/* Versión secundaria: fondo blanco, logotipo azul */
.zurich-header--claro {
  background: #ffffff;
  color: var(--zurich-azul-oscuro);
  border-bottom: 2px solid var(--zurich-azul);
}
```

```html
<!-- Principal -->
<header class="zurich-header">
  <img class="zurich-header__logo"
       src="/brand/zurich/zurich_logo_horizontal_blanco.png"
       alt="Zurich">
</header>

<!-- Secundaria -->
<header class="zurich-header zurich-header--claro">
  <img class="zurich-header__logo"
       src="/brand/zurich/zurich_logo_horizontal.png"
       alt="Zurich">
</header>
```

El atributo `alt` dice **«Zurich»**, no «logo de Zurich»: quien usa un lector de pantalla
necesita el nombre de la marca, no la descripción del archivo.

### En Word y PowerPoint

- Inserta el PNG en el encabezado del documento y fija su **alto**; el ancho se ajusta solo
  si mantienes bloqueada la proporción.
- Para la versión azul, pinta el rectángulo de encabezado con `#2167AE` y usa el logotipo
  **blanco**. Nunca pongas el logotipo a color sobre azul.
- Fuente: **Arial** si el archivo va a salir de la organización o a abrirse en un equipo sin
  Zurich Sans instalada. Es lo que indica el brandbook.

---

## 12. Lista de comprobación antes de entregar

- [ ] El logotipo va completo (Z + palabra «Zurich»), salvo caso justificado.
- [ ] La variante del logotipo corresponde al fondo: blanco sobre oscuro, color sobre claro.
- [ ] El logotipo mantiene su proporción 4,31 : 1 y tiene aire alrededor.
- [ ] El Azul de Zúrich `#2167AE` está presente y se lee como color principal.
- [ ] Los colores secundarios sólo aparecen como acento, nunca de fondo completo con imagen.
- [ ] `#ECEEEF` no se ha usado en nada destinado a impresión.
- [ ] La tipografía es Zurich Sans, o Arial si el archivo sale de la organización.
- [ ] No se ha usado Ogg en cuerpo de texto, en sublíneas ni para escribir «Zurich».
- [ ] Las fotografías parecen reales, no de archivo, y no llevan superposiciones gráficas.
- [ ] Si hay co-branding, los logotipos están a la misma altura y arriba a la izquierda.
- [ ] El texto sobre color cumple contraste AA (4,5 : 1 en texto normal).

---

## 13. Qué no cubre este documento

- **Zurich Sans y Ogg no están en el repositorio.** Son fuentes con licencia y hay que
  obtenerlas por los canales de la marca. Si no las tienes, usa Arial: el propio brandbook
  lo autoriza.
- El brandbook **no fija medidas numéricas** de área de resguardo del logotipo, tamaños
  mínimos de reproducción, ni una retícula editorial. Lo que aparece aquí sobre esos puntos
  va marcado como **[Convención]** y es criterio de este proyecto.
- No cubre tono de voz, redacción ni nomenclatura de productos.
- Las páginas del brandbook son mayoritariamente gráficas; este documento recoge el texto
  y las reglas explícitas. **Ante una duda visual, abre el PDF y míralo.**
