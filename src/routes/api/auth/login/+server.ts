import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verifyPassword, createToken } from '$lib/server/auth';
import { rateLimit } from '$lib/server/rate-limit';

export async function POST({ request, cookies, getClientAddress }) {
  const rl = rateLimit(getClientAddress());
  if (!rl.allowed) {
    return json({ error: `Prea multe încercări. Reîncercați în ${rl.retryAfter}s.` }, { status: 429 });
  }

  const { email, parola } = await request.json();
  if (!email || !parola) return json({ error: 'Email și parola sunt obligatorii' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(parola, user.parola))) {
    return json({ error: 'Email sau parolă incorectă' }, { status: 401 });
  }

  const token = createToken({ id: user.id, email: user.email, nume: user.nume });
  cookies.set('token', token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });
  return json({ id: user.id, email: user.email, nume: user.nume });
}
