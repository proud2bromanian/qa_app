import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verificaMembruProiect } from '$lib/server/auth';

export async function GET({ locals, params }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  const exec = await prisma.execution.findFirst({
    where: { id: params.execId, proiectId: params.id },
    include: {
      suite: true,
      rezultate: {
        orderBy: { id: 'asc' }
      }
    }
  });
  if (!exec) return json({ error: 'Execuție negăsită' }, { status: 404 });
  return json(exec);
}

export async function DELETE({ locals, params }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });

  const { autorizat, rol } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  if (rol !== 'administrator') return json({ error: 'Doar administratorii pot efectua această acțiune' }, { status: 403 });

  const execution = await prisma.execution.findFirst({
    where: { id: params.execId, proiectId: params.id }
  });
  if (!execution) return json({ error: 'Execuție negăsită' }, { status: 404 });

  const rezultate = await prisma.executionResult.findMany({
    where: { executieId: params.execId },
    select: { id: true }
  });
  const rezultatIds = rezultate.map(r => r.id);

  if (rezultatIds.length > 0) {
    await prisma.bugReport.updateMany({
      where: { executionResultId: { in: rezultatIds } },
      data: { executionResultId: null }
    });
  }

  await prisma.execution.delete({ where: { id: params.execId } });

  return json({ success: true });
}
