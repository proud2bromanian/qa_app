import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verificaMembruProiect } from '$lib/server/auth';
import { clampTake, containsText, nextOffset, readOffset } from '$lib/server/list-query';

export async function GET({ locals, params, url }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });

  const take = clampTake(url.searchParams.get('take'));
  const offset = readOffset(url.searchParams.get('offset') ?? url.searchParams.get('cursor'));
  const where = buildWhere(params.id, url);
  const baseWhere = { proiectId: params.id };

  const [totalAll, total, countDeschise, countInLucru, countRezolvate, countInchise, items] = await Promise.all([
    prisma.bugReport.count({ where: baseWhere }),
    prisma.bugReport.count({ where }),
    prisma.bugReport.count({ where: { ...baseWhere, status: 'deschis' } }),
    prisma.bugReport.count({ where: { ...baseWhere, status: 'in_lucru' } }),
    prisma.bugReport.count({ where: { ...baseWhere, status: 'rezolvat' } }),
    prisma.bugReport.count({ where: { ...baseWhere, status: 'inchis' } }),
    prisma.bugReport.findMany({
      where,
      skip: offset,
      take,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { test: true }
    })
  ]);

  return json({
    data: items,
    nextCursor: nextOffset(offset, items.length, total),
    total,
    totalAll,
    counts: {
      deschis: countDeschise,
      in_lucru: countInLucru,
      rezolvat: countRezolvate,
      inchis: countInchise
    }
  });
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

function buildWhere(proiectId: string, url: URL): Record<string, any> {
  const search = url.searchParams.get('search')?.trim() || '';
  const status = url.searchParams.get('status') || '';
  const severitate = url.searchParams.get('severitate') || '';
  const and: Record<string, any>[] = [];

  if (status) and.push({ status });
  if (severitate) and.push({ severitate });
  if (search) {
    and.push({
      OR: [
        { titlu: containsText(search) },
        { descriere: containsText(search) },
        { test: { is: { cod: containsText(search) } } },
        { test: { is: { titlu: containsText(search) } } }
      ]
    });
  }

  return and.length > 0 ? { proiectId, AND: and } : { proiectId };
}
