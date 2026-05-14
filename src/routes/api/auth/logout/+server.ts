import { json } from '@sveltejs/kit';

export async function POST({ cookies }) {
  cookies.set('token', '', { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 0 });
  return json({ ok: true });
}
