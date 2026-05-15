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

  const [totalAll, total, totalInProgres, executii] = await Promise.all([
    prisma.execution.count({ where: baseWhere }),
    prisma.execution.count({ where }),
    prisma.execution.count({ where: { ...baseWhere, status: 'in_progres' } }),
    prisma.execution.findMany({
      where,
      skip: offset,
      take,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { suite: true, rezultate: { select: { status: true } } }
    })
  ]);

  const data = executii.map(e => ({
    id: e.id,
    nume: e.nume,
    suiteId: e.suiteId,
    status: e.status,
    createdAt: e.createdAt,
    suite: e.suite,
    totalTeste: e.rezultate.length,
    testate: e.rezultate.filter(r => r.status !== 'netestat').length
  }));
  return json({
    data,
    nextCursor: nextOffset(offset, data.length, total),
    total,
    totalAll,
    totalInProgres
  });
}

export async function POST({ locals, params, request }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  const { suiteId, nume, testIds } = await request.json();

  let testLinks: { testId: string }[] = [];

  if (testIds && testIds.length > 0) {
    testLinks = testIds.map((id: string) => ({ testId: id }));
  } else {
    if (!suiteId) return json({ error: 'Selectați o suită' }, { status: 400 });
    const suita = await prisma.testSuite.findUnique({
      where: { id: suiteId },
      include: { teste: true }
    });
    if (!suita) return json({ error: 'Suită negăsită' }, { status: 404 });
    testLinks = suita.teste.map(t => ({ testId: t.testId }));
  }

  if (testLinks.length === 0) return json({ error: 'Niciun test de executat' }, { status: 400 });

  const testIdsToSnapshot = testLinks.map(t => t.testId);
  const teste = await prisma.testCase.findMany({
    where: { id: { in: testIdsToSnapshot } }
  });
  const testMap = new Map(teste.map(t => [t.id, t]));

  const execution = await prisma.$transaction(async (tx) => {
    const created = await tx.execution.create({
      data: {
        nume: nume || `Execuție ${new Date().toLocaleDateString('ro-RO')}`,
        proiectId: params.id,
        suiteId: suiteId || null,
        status: 'in_progres',
        rezultate: {
          create: testLinks.map(tl => {
            const tc = testMap.get(tl.testId);
            return {
              testId: tl.testId,
              status: 'netestat',
              cod: tc?.cod || '',
              titlu: tc?.titlu || '',
              mediu: tc?.mediu || '',
              pasi: tc?.pasi || '',
              rezultatAsteptat: tc?.rezultatAsteptat || '',
              rezultatObtinut: tc?.rezultatObtinut || '',
              prioritate: tc?.prioritate || 'medie',
              dovezi: ''
            };
          })
        }
      },
      include: { rezultate: true }
    });

    if (created.suiteId) {
      await tx.testSuite.update({
        where: { id: created.suiteId },
        data: { lastExecutionAt: created.createdAt }
      });
    }

    return created;
  });

  return json(execution, { status: 201 });
}

function buildWhere(proiectId: string, url: URL): Record<string, any> {
  const search = url.searchParams.get('search')?.trim() || '';
  if (!search) return { proiectId };

  return {
    proiectId,
    OR: [
      { nume: containsText(search) },
      { suite: { is: { nume: containsText(search) } } }
    ]
  };
}
