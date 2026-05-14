import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verificaMembruProiect } from '$lib/server/auth';

export async function GET({ locals, params }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const proiect = await prisma.project.findFirst({
    where: { id: params.id, membri: { some: { userId: locals.user.id } } },
    include: { membri: { include: { user: { select: { id: true, email: true, nume: true } } } }, _count: { select: { teste: true, suite: true, buguri: true } } }
  });
  if (!proiect) return json({ error: 'Proiect negăsit' }, { status: 404 });
  return json(proiect);
}

export async function PATCH({ locals, params, request }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat, rol } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  if (rol !== 'administrator') return json({ error: 'Doar administratorii pot modifica proiectul' }, { status: 403 });
  const { nume, descriere } = await request.json();
  const proiect = await prisma.project.update({ where: { id: params.id }, data: { ...(nume && { nume }), ...(descriere !== undefined && { descriere }) } });
  return json(proiect);
}

export async function DELETE({ locals, params }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat, rol } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  if (rol !== 'administrator') return json({ error: 'Doar administratorii pot șterge proiectul' }, { status: 403 });
  await prisma.project.delete({ where: { id: params.id } });
  return json({ success: true });
}
