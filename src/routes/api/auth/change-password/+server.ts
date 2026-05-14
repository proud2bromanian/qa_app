import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verifyToken, hashPassword, verifyPassword } from '$lib/server/auth';

export async function POST({ request, cookies }) {
  const token = cookies.get('token');
  if (!token) return json({ error: 'Neautorizat' }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return json({ error: 'Token invalid' }, { status: 401 });

  const { parolaCurenta, parolaNoua } = await request.json();
  if (!parolaCurenta || !parolaNoua) {
    return json({ error: 'Toate câmpurile sunt obligatorii' }, { status: 400 });
  }
  if (parolaNoua.length < 6) {
    return json({ error: 'Noua parolă trebuie să aibă cel puțin 6 caractere' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user) return json({ error: 'Utilizator negăsit' }, { status: 404 });

  const match = await verifyPassword(parolaCurenta, user.parola);
  if (!match) return json({ error: 'Parola curentă este incorectă' }, { status: 400 });

  const parolaNouaHash = await hashPassword(parolaNoua);
  await prisma.user.update({ where: { id: user.id }, data: { parola: parolaNouaHash } });

  cookies.set('token', '', { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 0 });

  return json({ success: true });
}
