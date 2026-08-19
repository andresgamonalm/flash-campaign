# Flash Campaign

Aplicativo web para armar propuestas de anuncios y campañas digitales de marca y
performance en **Google Search**, **Google Display** y **Meta**.

- **Google Search**: el asistente **Char B** (API de Google Gemini) lee las páginas
  de la promoción, razona producto, competencia y oferta, y propone títulos,
  descripciones, palabras clave por concordancia, negativas y extensiones, ya
  ajustadas a los límites de Google Ads.
- **Google Display y Meta**: editor gráfico propio. Se diseña una sola vez el
  lienzo base de **300 × 250** y el botón **Replicar** genera los 18 formatos
  restantes con reglas específicas para piezas horizontales y verticales.

Producido por Gamonal. Subdominio previsto: `flash-campaign.gamonal.app`.

---

## Puesta en marcha

```bash
npm install
npm run dev:cf     # compila y levanta el aplicativo completo (frontend + API) en http://127.0.0.1:8788
```

`npm run dev` levanta sólo el frontend de Vite; el backend vive en las funciones de
Cloudflare Pages, así que para trabajar con datos reales conviene usar `dev:cf`.

Credenciales iniciales: las define `data/usuarios.json`. El archivo guarda un hash
PBKDF2-SHA256 con sal; la contraseña en claro nunca viaja al repositorio. Para
cambiar la contraseña del administrador desde consola:

```bash
node scripts/seed_users.mjs "<nueva-contraseña>"
```

## Despliegue en Cloudflare Pages

1. Conecta el repositorio a Cloudflare Pages.
   - Comando de build: `npm run build`
   - Directorio de salida: `dist`
2. Declara los enlaces y variables **en el panel de Cloudflare**:

| Nombre | Tipo | Obligatorio | Para qué sirve |
|---|---|---|---|
| `DB` | Base de datos D1 | Sí | Usuarios, marcas, proyectos e historial |
| `IMAGENES` | Bucket R2 | Recomendado | Biblioteca de imágenes: catálogo existente y subidas |
| `JWT_SECRET` o `SESSION_SECRET` | Secreto | Recomendado | Firma de la cookie de sesión |
| `GEMINI_API_KEY` | Secreto | Sí para Search | Clave de Google Gemini que usa Char B |
| `GEMINI_MODEL` | Variable | No | Modelo a usar (por defecto `gemini-2.5-flash`) |
| `MEDIA_BASE_URL` | Variable | No | Dominio público del bucket: si se define, la biblioteca sirve las imágenes desde ahí en vez de por la API |
| `MEDIA_MANIFEST_URL` | Variable | No | Manifiesto JSON alternativo, sólo si el catálogo no vive en el bucket enlazado |
| `D1_BINDING` / `R2_BINDING` / `KV_BINDING` | Variable | No | Nombre real del enlace, si usa una etiqueta distinta de las anteriores |

Si en lugar de D1 se prefiere un espacio KV, el aplicativo también funciona con un
enlace llamado `FLASH_KV`: se usa D1 cuando ambos están presentes. Las tablas de D1
(`documentos` y `binarios`) se crean solas la primera vez, no hay que ejecutar
ninguna migración.

> El repositorio **no incluye `wrangler.toml` a propósito**. Cuando un proyecto de
> Pages tiene ese archivo, Cloudflare toma su contenido como fuente de verdad e
> ignora los enlaces y variables definidos en el panel. Como aquí la configuración
> vive en el panel, agregar un `wrangler.toml` dejaría el aplicativo sin KV, sin R2
> y sin la clave de Gemini.

Los enlaces se toman por su nombre. Si usan otra etiqueta, basta con indicarlo en
`D1_BINDING`, `R2_BINDING` o `KV_BINDING`. **Configuración → Estado del despliegue**
muestra el nombre que el aplicativo encontró, para poder verificarlo sin salir de
la pantalla.

Con el bucket R2 enlazado, la biblioteca lista **directamente** las imágenes que ya
estaban cargadas en él: no hace falta ningún manifiesto. Las carpetas del bucket se
convierten en etiquetas de búsqueda y las subidas de los usuarios quedan bajo el
prefijo `img/`, separadas del catálogo común. Sin `FLASH_KV` el aplicativo funciona,
pero avisa en pantalla que el almacenamiento es temporal.

## Estructura

```
data/usuarios.json        Semilla de cuentas versionada (sólo hashes)
docs/                     Documentación, capturas y recursos de marca del producto
functions/                API en Cloudflare Pages Functions
  _lib/                   Entorno, almacenamiento, usuarios e historial
  api/                    Rutas: auth, usuarios, marcas, proyectos, biblioteca, ia, estado
public/brand/             Logotipos de Flash Campaign, Zurich y endoso Gamonal
public/biblioteca/        Material gráfico que viaja con el proyecto
scripts/                  Generación de marca, semilla de usuarios y pruebas
scripts/qa/               Recorrido funcional y prueba visual de replicación
shared/                   Código compartido entre navegador y funciones (hash, sesión)
src/components/           Shell, lienzo, inspector, selectores y sistema de UI
src/lib/                  Modelo, API, replicación, render, exportación y marca
src/pages/                Una pantalla por ruta
Info-Zurich/              Material de marca entregado con el encargo
```

## Rutas

| Ruta | Pantalla |
|---|---|
| `/login` | Acceso |
| `/` | Inicio |
| `/campanas/nueva` | Crear campaña |
| `/campanas/:id/search` | Creador de Google Search con Char B |
| `/campanas/:id/editor` | Editor de banners para Display y Meta |
| `/proyectos` | Proyectos en curso |
| `/proyectos/realizados` | Proyectos realizados |
| `/marcas` | Marcas guardadas y creación de marcas |
| `/biblioteca` | Biblioteca de imágenes |
| `/historial` | Historial de trabajos |
| `/configuracion` | Configuración de la cuenta y estado del despliegue |
| `/usuarios` | Administración de cuentas (sólo administrador) |

## Pruebas

```bash
npm run typecheck                 # tipos del frontend y de las funciones
node scripts/qa/stub-gemini.mjs   # doble de pruebas de Gemini (puerto 8899)
node scripts/qa/recorrido.mjs     # recorrido funcional completo con navegador real
node scripts/qa/replicacion.mjs   # prueba visual de las 3 reglas de replicación
```

El recorrido cubre login, creación de campaña, generación con Char B, edición,
arrastre y redimensión reales, replicación, vista previa, exportación de ZIP y CSV,
administración de usuarios y comprobación de responsive.

## Exportación

- **JPG** por formato, con la calidad configurable en el momento de exportar.
- **HTML5** autónomo por pieza, con `<meta name="ad.size">` y variable `clickTag`,
  tal como piden Google Ads y Campaign Manager.
- Todo se entrega en un único ZIP con un `LEEME.txt` que lista el contenido.
