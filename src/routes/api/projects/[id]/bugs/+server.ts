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
    prisma.bugReport.count({ where }),
    prisma.bugReport.findMany({
      where,
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: { test: true }
    })
  ]);

  const nextCursor = items.length > take ? items.pop()?.id : null;
  return json({ data: items, nextCursor, total });
}

export async function POST({ locals, params, request }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  const { titlu, descriere, testId, executionResultId, severitate: severitateRaw } = await request.json();
  if (!titlu) return json({ error: 'Titlul este obligatoriu' }, { status: 400 });
  const severitateValide = ['critica', 'majora', 'moderata', 'minora'];
  const severitate = severitateValide.includes(severitateRaw) ? severitateRaw : 'moderata';
  const bug = await prisma.bugReport.create({
    data: {
      titlu,
      descriere: descriere || '',
      testId: testId || null,
      executionResultId: executionResultId || null,
      severitate,
      proiectId: params.id
    }
  });
  return json(bug, { status: 201 });
}

export async function PATCH({ locals, params, request }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  const { id, status, severitate: severitateRaw } = await request.json();
  const data: Record<string, any> = {};
  const statusesValide = ['deschis', 'in_lucru', 'rezolvat', 'inchis'];
  if (status) {
    if (!statusesValide.includes(status)) return json({ error: 'Status invalid' }, { status: 400 });
    data.status = status;
  }
  if (severitateRaw) {
    const severitateValide = ['critica', 'majora', 'moderata', 'minora'];
    if (!severitateValide.includes(severitateRaw)) return json({ error: 'Severitate invalidă' }, { status: 400 });
    data.severitate = severitateRaw;
  }
  const bug = await prisma.bugReport.update({ where: { id }, data });
  return json(bug);
}

export async function DELETE({ locals, params }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  await prisma.bugReport.deleteMany({ where: { proiectId: params.id } });
  return json({ success: true });
}
