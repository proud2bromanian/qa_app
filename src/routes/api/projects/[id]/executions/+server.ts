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

  const [total, executii] = await Promise.all([
    prisma.execution.count({ where }),
    prisma.execution.findMany({
      where,
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: { suite: true, rezultate: { select: { status: true } } }
    })
  ]);

  const nextCursor = executii.length > take ? executii.pop()?.id : null;
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
  return json({ data, nextCursor, total });
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

  const execution = await prisma.execution.create({
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
  return json(execution, { status: 201 });
}
