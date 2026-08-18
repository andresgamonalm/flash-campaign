import { cookieBorrada, json, type Env } from '../../_lib/entorno'

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  return json({ ok: true }, { headers: { 'set-cookie': cookieBorrada(new URL(request.url)) } })
}
