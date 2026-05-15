import { json } from '@sveltejs/kit';

export async function POST({ cookies }) {
  const cookieOpts = { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', maxAge: 0 };
  cookies.set('token', '', cookieOpts);
  return json({ ok: true });
}
