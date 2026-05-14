import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verificaMembruProiect } from '$lib/server/auth';

export async function PATCH({ locals, params, request }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  const { rezultatId, status } = await request.json();
  if (!rezultatId || !status) return json({ error: 'Date incomplete' }, { status: 400 });

  const rezultatVechi = await prisma.executionResult.findUnique({
    where: { id: rezultatId }
  });
  if (!rezultatVechi) return json({ error: 'Rezultat negăsit' }, { status: 404 });

  const rezultat = await prisma.executionResult.update({
    where: { id: rezultatId },
    data: { status }
  });

  if (status === 'esuat') {
    const existent = await prisma.bugReport.findFirst({
      where: { executionResultId: rezultatId }
    });
    if (!existent) {
      await prisma.bugReport.create({
        data: {
          titlu: `Bug: ${rezultat.titlu || rezultatVechi.titlu}`,
          descriere: `Test eșuat în execuția ${params.execId}\n\nRezultat obținut: ${rezultat.rezultatObtinut || rezultatVechi.rezultatObtinut}\nRezultat așteptat: ${rezultat.rezultatAsteptat || rezultatVechi.rezultatAsteptat}`,
          status: 'deschis',
          testId: rezultat.testId,
          executionResultId: rezultatId,
          proiectId: params.id
        }
      });
    }
  }

  return json(rezultat);
}
