// Genera data/usuarios.json con el hash PBKDF2 de la contraseña del administrador.
// La contraseña en claro nunca se escribe en el repositorio.
import { writeFileSync } from 'node:fs'

// Debe coincidir con ITERACIONES en shared/passwords.ts: está ajustado al
// presupuesto de CPU de Cloudflare (ver el comentario de ese archivo).
const ITERACIONES = 12_000
const b64 = (bytes) => Buffer.from(bytes).toString('base64')

async function crearHash(clave) {
  const sal = crypto.getRandomValues(new Uint8Array(16))
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave.normalize('NFC')), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: sal, iterations: ITERACIONES, hash: 'SHA-256' }, material, 256)
  return `pbkdf2$${ITERACIONES}$${b64(sal)}$${b64(new Uint8Array(bits))}`
}

const clave = process.argv[2]
if (!clave) { console.error('Uso: node scripts/seed_users.mjs <clave-admin>'); process.exit(1) }

const usuarios = [
  {
    id: 'usr_admin',
    email: 'hola@andresgamonal.com',
    nombre: 'Andrés Gamonal',
    rol: 'admin',
    activo: true,
    zonaHoraria: 'America/Santiago',
    correoContacto: 'hola@andresgamonal.com',
    creadoEn: '2026-01-01T00:00:00.000Z',
    hash: await crearHash(clave),
  },
]

writeFileSync('data/usuarios.json', JSON.stringify({ version: 1, usuarios }, null, 2) + '\n')
console.log('data/usuarios.json actualizado con', usuarios.length, 'usuario(s).')
