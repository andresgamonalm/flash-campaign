/**
 * Almacén local sobre IndexedDB.
 *
 * Se usa cuando el aplicativo corre sin las funciones de Cloudflare detrás
 * (por ejemplo en `npm run dev` o en una vista previa estática). IndexedDB, y no
 * localStorage, porque la biblioteca de imágenes y los proyectos superan de
 * inmediato el límite de 5 MB.
 */

const BASE = 'flash-campaign'
const VERSION = 1
const ALMACENES = ['clave_valor', 'imagenes'] as const

export type NombreAlmacen = (typeof ALMACENES)[number]

let promesaBase: Promise<IDBDatabase> | null = null

function abrir(): Promise<IDBDatabase> {
  if (promesaBase) return promesaBase
  promesaBase = new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(BASE, VERSION)
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result
      for (const nombre of ALMACENES) {
        if (!db.objectStoreNames.contains(nombre)) db.createObjectStore(nombre)
      }
    }
    solicitud.onsuccess = () => resolve(solicitud.result)
    solicitud.onerror = () => reject(solicitud.error ?? new Error('No se pudo abrir el almacén local.'))
  })
  return promesaBase
}

async function transaccion<T>(
  almacen: NombreAlmacen,
  modo: IDBTransactionMode,
  accion: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await abrir()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(almacen, modo)
    const solicitud = accion(tx.objectStore(almacen))
    solicitud.onsuccess = () => resolve(solicitud.result)
    solicitud.onerror = () => reject(solicitud.error ?? new Error('Error de escritura local.'))
  })
}

export async function leer<T>(almacen: NombreAlmacen, clave: string): Promise<T | undefined> {
  return transaccion<T | undefined>(almacen, 'readonly', (store) => store.get(clave) as IDBRequest<T | undefined>)
}

export async function escribir<T>(almacen: NombreAlmacen, clave: string, valor: T): Promise<void> {
  await transaccion(almacen, 'readwrite', (store) => store.put(valor, clave) as IDBRequest<IDBValidKey>)
}

export async function borrar(almacen: NombreAlmacen, clave: string): Promise<void> {
  await transaccion(almacen, 'readwrite', (store) => store.delete(clave) as IDBRequest<undefined>)
}

export async function listarClaves(almacen: NombreAlmacen): Promise<string[]> {
  const claves = await transaccion<IDBValidKey[]>(almacen, 'readonly', (store) => store.getAllKeys())
  return claves.map(String)
}

export async function listarTodo<T>(almacen: NombreAlmacen): Promise<T[]> {
  return transaccion<T[]>(almacen, 'readonly', (store) => store.getAll() as IDBRequest<T[]>)
}
