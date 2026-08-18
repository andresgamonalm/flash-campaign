# Registro de decisiones visuales — Flash Campaign

| ID | Pieza o pantalla | Corrección o rechazo | Decisión vigente | Estado |
|---|---|---|---|---|
| DEC-001 | Identidad del aplicativo | El logotipo de Gamonal no puede hacer de logotipo de producto | Flash Campaign tiene isotipo propio: dos lienzos superpuestos (turquesa detrás, azul principal delante) con un rayo blanco. Gamonal aparece sólo como endoso «Desarrollado por» en sidebar y login | VIGENTE |
| DEC-002 | `/login`, panel visual | Con la fotografía bloqueada, el mensaje azul quedaba azul sobre azul | El panel visual usa turquesa `#20B6B6` como base sólida y el mensaje mantiene azul `#040764`; si la foto no carga, la imagen se oculta en lugar de mostrar el texto alternativo | VIGENTE |
| DEC-003 | Home | Prohibido resolver el home como acumulación de cards blancas | Apertura en bloque sólido azul con fotografía real, seguida de métricas en superficie verde agua y tres tarjetas de plataforma; composición distinta a las pantallas interiores | VIGENTE |
| DEC-004 | Endoso Gamonal | El SVG oficial declara `viewBox` de 1050×150 mientras el dibujo ocupa hasta 245 px de alto, por lo que el navegador cortaba el logotipo | Se usa el PNG oficial de 2100×600 (`Logo_1_Gamonal-Azulino-Azulino.png` y `Logo_4_Gamonal-BL-Blanco.png`), recortado a su contenido real sin alterar el dibujo | VIGENTE |
| DEC-005 | Sistema de componentes | Radio de borde uniforme entre 5 y 10 px | Todo el proyecto usa `--radio: 8px`; sólo los avatares y las píldoras de estado usan radio completo por función | VIGENTE |
| DEC-006 | Editor de banners | El texto del CTA quedaba blanco sobre coral, sin contraste | El color del texto del CTA se decide por razón de contraste WCAG contra el relleno elegido (`src/lib/contraste.ts`) | VIGENTE |
| DEC-007 | Replicación a formatos horizontales | Un cuadro de texto que sobresalía unos píxeles se trataba como recurso de fondo y se ampliaba desmedidamente | `sangra()` sólo considera decoración a formas e imágenes que desbordan más del 12 % del lienzo; el texto siempre es contenido | VIGENTE |
| DEC-008 | Replicación, recursos de fondo | En banda horizontal el semicírculo de fondo se ampliaba por el ancho y tapaba el logotipo | La decoración escala por alto en banda horizontal y por ancho en columna vertical | VIGENTE |
| DEC-009 | Tablas en móvil | Los encabezados sólo para lectores de pantalla empujaban el ancho de página y generaban scroll horizontal | `.tabla-scroll` es contenedor posicionado y `.visually-hidden` añade `clip-path` | VIGENTE |
| DEC-010 | Iconografía | Prohibido mezclar familias o usar emojis | Familia propia en `src/components/Icono.tsx`: cuadrícula 24, trazo 1.75, extremos redondeados, sin relleno | VIGENTE |
