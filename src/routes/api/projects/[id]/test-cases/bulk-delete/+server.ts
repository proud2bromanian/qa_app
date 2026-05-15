import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verificaMembruProiect } from '$lib/server/auth';

export async function POST({ locals, params, request }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return json({ error: 'Selectați cel puțin un test' }, { status: 400 });
  }
  if (ids.length > 500) {
    return json({ error: 'Maxim 500 de teste pot fi șterse odată' }, { status: 400 });
  }

  const result = await prisma.testCase.deleteMany({
    where: { id: { in: ids }, proiectId: params.id }
  });

  return json({ deleted: result.count });
}
