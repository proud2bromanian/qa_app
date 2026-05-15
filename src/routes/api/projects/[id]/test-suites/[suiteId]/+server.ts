import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verificaMembruProiect } from '$lib/server/auth';

export async function GET({ locals, params }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  const suita = await prisma.testSuite.findFirst({
    where: { id: params.suiteId, proiectId: params.id },
    include: {
      teste: {
        include: { test: true },
        orderBy: { ordine: 'asc' }
      }
    }
  });
  if (!suita) return json({ error: 'Suită negăsită' }, { status: 404 });
  return json(suita);
}

export async function PATCH({ locals, params, request }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  const body = await request.json();

  if (body.teste) {
    await prisma.$transaction(async (tx) => {
      await tx.testSuiteToTestCase.deleteMany({ where: { suiteId: params.suiteId } });
      if (body.teste.length > 0) {
        await tx.testSuiteToTestCase.createMany({
          data: body.teste.map((testId: string, idx: number) => ({
            suiteId: params.suiteId,
            testId,
            ordine: idx
          }))
        });
      }
    });
  }

  if (body.nume) {
    await prisma.testSuite.update({ where: { id: params.suiteId }, data: { nume: body.nume } });
  }

  if (body.descriere !== undefined) {
    await prisma.testSuite.update({ where: { id: params.suiteId }, data: { descriere: body.descriere } });
  }

  const suita = await prisma.testSuite.findFirst({
    where: { id: params.suiteId },
    include: { teste: { include: { test: true }, orderBy: { ordine: 'asc' } } }
  });
  return json(suita);
}

export async function DELETE({ locals, params }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  await prisma.execution.updateMany({
    where: { suiteId: params.suiteId },
    data: { suiteId: null }
  });
  await prisma.testSuiteToTestCase.deleteMany({ where: { suiteId: params.suiteId } });
  await prisma.testSuite.delete({ where: { id: params.suiteId } });
  return json({ success: true });
}
