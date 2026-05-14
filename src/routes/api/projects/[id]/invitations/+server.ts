import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import crypto from 'crypto';
import { verificaMembruProiect } from '$lib/server/auth';

export async function POST({ locals, params }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat, rol } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  if (rol !== 'administrator') return json({ error: 'Doar administratorii pot efectua această acțiune' }, { status: 403 });
  const cod = crypto.randomBytes(4).toString('hex').toUpperCase();
  const expiraLa = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invitatie = await prisma.invitation.create({
    data: { cod, proiectId: params.id, expiraLa }
  });
  return json(invitatie, { status: 201 });
}

export async function GET({ locals, params }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  const invitati = await prisma.invitation.findMany({
    where: { proiectId: params.id, activa: true, expiraLa: { gt: new Date() } },
    orderBy: { expiraLa: 'desc' }
  });
  return json(invitati);
}
