import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verificaMembruProiect } from '$lib/server/auth';

export async function GET({ locals, params, url }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });

  const take = Number(url.searchParams.get('take')) || 50;
  const cursor = url.searchParams.get('cursor') || undefined;
  const where = { proiectId: params.id };

  const [total, items] = await Promise.all([
    prisma.testSuite.count({ where }),
    prisma.testSuite.findMany({
      where,
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { nume: 'asc' },
      include: { _count: { select: { teste: true } } }
    })
  ]);

  const nextCursor = items.length > take ? items.pop()?.id : null;
  return json({ data: items, nextCursor, total });
}

export async function POST({ locals, params, request }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  const { nume, descriere } = await request.json();
  if (!nume) return json({ error: 'Numele suitei este obligatoriu' }, { status: 400 });
  const suita = await prisma.testSuite.create({
    data: { nume, descriere: descriere || '', proiectId: params.id }
  });
  return json(suita, { status: 201 });
}
