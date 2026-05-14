import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verificaMembruProiect } from '$lib/server/auth';

export async function GET({ locals, params }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });

  const [totalTests, buguriActive, buguriTotal, executii, suite] = await Promise.all([
    prisma.testCase.count({ where: { proiectId: params.id } }),
    prisma.bugReport.count({ where: { proiectId: params.id, status: 'deschis' } }),
    prisma.bugReport.count({ where: { proiectId: params.id } }),
    prisma.execution.findMany({
      where: { proiectId: params.id },
      include: { rezultate: { select: { status: true } }, suite: { select: { nume: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.testSuite.count({ where: { proiectId: params.id } })
  ]);

  let totalRezultate = 0;
  let trecute = 0;
  let esuate = 0;
  let blocate = 0;
  executii.forEach(e => {
    e.rezultate.forEach(r => {
      totalRezultate++;
      if (r.status === 'trecut') trecute++;
      else if (r.status === 'esuat') esuate++;
      else if (r.status === 'blocat') blocate++;
    });
  });

  const netestate = totalRezultate - trecute - esuate - blocate;
  const passRate = totalRezultate > 0 ? Math.round((trecute / totalRezultate) * 100) : 0;
  const failRate = totalRezultate > 0 ? Math.round((esuate / totalRezultate) * 100) : 0;
  const blocatRate = totalRezultate > 0 ? Math.round((blocate / totalRezultate) * 100) : 0;
  const netestatRate = totalRezultate > 0 ? Math.round((netestate / totalRezultate) * 100) : 0;

  const recentExecutions = executii.slice(0, 5).map(e => ({
    id: e.id,
    nume: e.nume,
    status: e.status,
    createdAt: e.createdAt,
    suiteNume: e.suite?.nume || null,
    totalTeste: e.rezultate.length,
    testate: e.rezultate.filter(r => r.status !== 'netestat').length,
    trecute: e.rezultate.filter(r => r.status === 'trecut').length,
    esuate: e.rezultate.filter(r => r.status === 'esuat').length
  }));

  return json({
    totalTests,
    buguriActive,
    buguriTotal,
    suite,
    executii: executii.length,
    stats: { totalRezultate, trecute, esuate, blocate, netestate, passRate, failRate, blocatRate, netestatRate },
    recentExecutions
  });
}
