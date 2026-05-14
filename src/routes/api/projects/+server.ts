import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';

export async function GET({ locals }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const proiecte = await prisma.project.findMany({
    where: { membri: { some: { userId: locals.user.id } } },
    include: { _count: { select: { membri: true, teste: true, suite: true } } },
    orderBy: { updatedAt: 'desc' }
  });
  return json(proiecte);
}

export async function POST({ locals, request }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { nume, descriere } = await request.json();
  if (!nume) return json({ error: 'Numele proiectului este obligatoriu' }, { status: 400 });

  const proiect = await prisma.project.create({
    data: { nume, descriere: descriere || '' }
  });

  await prisma.projectMember.create({
    data: { userId: locals.user.id, proiectId: proiect.id, rol: 'administrator' }
  });

  return json(proiect, { status: 201 });
}
