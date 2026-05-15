import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verificaMembruProiect } from '$lib/server/auth';
import { clampTake, containsText, nextOffset, readOffset } from '$lib/server/list-query';
import { ensureSuiteLastExecutionDates } from '$lib/server/test-suite-stats';

export async function GET({ locals, params, url }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });

  const take = clampTake(url.searchParams.get('take'));
  const offset = readOffset(url.searchParams.get('offset') ?? url.searchParams.get('cursor'));
  const where = buildWhere(params.id, url);
  const orderBy = buildOrderBy(url.searchParams.get('sort'));
  const baseWhere = { proiectId: params.id };

  if (url.searchParams.get('selectOptions')) {
    const items = await prisma.testSuite.findMany({
      where: baseWhere,
      orderBy: [{ nume: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        nume: true,
        _count: { select: { teste: true } }
      }
    });
    return json({ data: items });
  }

  await ensureSuiteLastExecutionDates(params.id);

  const [totalAll, total, totalTesteAcoperite, suiteCuExecutiiRaw, items] = await Promise.all([
    prisma.testSuite.count({ where: baseWhere }),
    prisma.testSuite.count({ where }),
    prisma.testSuiteToTestCase.count({ where: { suite: { proiectId: params.id } } }),
    prisma.execution.findMany({
      where: { proiectId: params.id, suiteId: { not: null } },
      distinct: ['suiteId'],
      select: { suiteId: true }
    }),
    prisma.testSuite.findMany({
      where,
      skip: offset,
      take,
      orderBy,
      include: {
        _count: { select: { teste: true } },
        executii: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { id: true, suiteId: true, status: true, createdAt: true }
        }
      }
    })
  ]);

  return json({
    data: items,
    nextCursor: nextOffset(offset, items.length, total),
    total,
    totalAll,
    totalTesteAcoperite,
    suiteCuExecutii: suiteCuExecutiiRaw.length
  });
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

function buildWhere(proiectId: string, url: URL): Record<string, any> {
  const search = url.searchParams.get('search')?.trim() || '';
  if (!search) return { proiectId };

  return {
    proiectId,
    OR: [
      { nume: containsText(search) },
      { descriere: containsText(search) }
    ]
  };
}

function buildOrderBy(sort: string | null) {
  if (sort === 'teste') return [{ teste: { _count: 'desc' } }, { nume: 'asc' }, { id: 'asc' }];
  if (sort === 'data') return [{ lastExecutionAt: { sort: 'desc', nulls: 'last' } }, { nume: 'asc' }, { id: 'asc' }];
  return [{ nume: 'asc' }, { id: 'asc' }];
}
