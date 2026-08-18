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
2. Crea los enlaces y variables del proyecto:

| Nombre | Tipo | Obligatorio | Para qué sirve |
|---|---|---|---|
| `FLASH_KV` | KV namespace | Sí | Usuarios, marcas, proyectos, historial y biblioteca |
| `MEDIA` | Bucket R2 | Recomendado | Archivos de la biblioteca de imágenes |
| `SESSION_SECRET` | Secreto | Recomendado | Firma de la cookie de sesión |
| `GEMINI_API_KEY` | Secreto | Sí para Search | Clave de Google Gemini que usa Char B |
| `GEMINI_MODEL` | Variable | No | Modelo a usar (por defecto `gemini-2.5-flash`) |
| `MEDIA_MANIFEST_URL` | Variable | No | Manifiesto JSON de las imágenes ya cargadas en Cloudflare |
| `MEDIA_BASE_URL` | Variable | No | Base pública si el manifiesto trae rutas relativas |

Sin `FLASH_KV` el aplicativo funciona, pero avisa en pantalla que el
almacenamiento es temporal. **Configuración → Estado del despliegue** muestra en
todo momento qué está enlazado y qué falta.

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
