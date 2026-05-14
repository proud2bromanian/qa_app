import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { hashPassword, createToken } from '$lib/server/auth';
import { rateLimit } from '$lib/server/rate-limit';

export async function POST({ request, cookies, getClientAddress }) {
  const rl = rateLimit(getClientAddress());
  if (!rl.allowed) {
    return json({ error: `Prea multe încercări. Reîncercați în ${rl.retryAfter}s.` }, { status: 429 });
  }

  const { email, nume, parola } = await request.json();
  if (!email || !nume || !parola) return json({ error: 'Toate câmpurile sunt obligatorii' }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return json({ error: 'Email deja înregistrat' }, { status: 400 });

  const user = await prisma.user.create({
    data: { email, nume, parola: await hashPassword(parola) }
  });

  const token = createToken({ id: user.id, email: user.email, nume: user.nume });
  cookies.set('token', token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });
  return json({ id: user.id, email: user.email, nume: user.nume });
}
