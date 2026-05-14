import prisma from '$lib/server/prisma';
import { verificaMembruProiect } from '$lib/server/auth';

export async function GET({ locals, params }) {
  if (!locals.user) return new Response('Neautentificat', { status: 401 });

  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return new Response('Nu aveți acces la acest proiect', { status: 403 });

  const teste = await prisma.testCase.findMany({
    where: { proiectId: params.id },
    include: { atasamente: { select: { cale: true } } },
    orderBy: { id: 'asc' }
  });

  const BOM = '\uFEFF';
  const header = 'ID,Titlu,Mediu,Pași,Rezultat Așteptat,Rezultat Obținut,Tip Testare,Prioritate\n';
  const rows = teste.map(t => {
    const escape = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
    return [escape(t.cod || 'TC-0'), escape(t.titlu), escape(t.mediu), escape(t.pasi), escape(t.rezultatAsteptat), escape(t.rezultatObtinut), escape(t.tipTestare === 'automata' ? 'Automată' : 'Manuală'), escape(t.prioritate || 'medie')].join(',');
  }).join('\n');

  return new Response(BOM + header + rows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="teste_${params.id}.csv"`
    }
  });
}
