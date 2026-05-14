import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verificaMembruProiect } from '$lib/server/auth';
import {
  filtreazaFisiereIncarcate,
  salveazaAtasamenteCaDataUrls,
  valideazaAtasamenteImagine
} from '$lib/server/attachments';

export async function GET({ locals, params, url }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });

  const take = Number(url.searchParams.get('take')) || 50;
  const cursor = url.searchParams.get('cursor') || undefined;
  const where = { proiectId: params.id };

  const [total, items] = await Promise.all([
    prisma.testCase.count({ where }),
    prisma.testCase.findMany({
      where,
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'desc' },
      include: { atasamente: { select: { id: true, cale: true } } }
    })
  ]);

  const nextCursor = items.length > take ? items.pop()?.id : null;
  return json({ data: items, nextCursor, total });
}

export async function POST({ locals, params, request }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });

  try {
    const formData = await request.formData();
    const titlu = (formData.get('titlu') as string) || '';
    const mediu = (formData.get('mediu') as string) || '';
    const pasi = (formData.get('pasi') as string) || '';
    const rezultatAsteptat = (formData.get('rezultatAsteptat') as string) || '';
    const rezultatObtinut = (formData.get('rezultatObtinut') as string) || '';
    const tipTestare = (formData.get('tipTestare') as string) || 'manuala';
    const prioritateRaw = (formData.get('prioritate') as string) || 'medie';
    const prioritateValide = ['critica', 'inalta', 'medie', 'scăzuta'];
    const prioritate = prioritateValide.includes(prioritateRaw) ? prioritateRaw : 'medie';

    if (!titlu || !mediu || !pasi || !rezultatAsteptat) {
      return json({ error: 'Titlu, Mediu, Pași și Rezultat Așteptat sunt obligatorii' }, { status: 400 });
    }

    const files = formData.getAll('screenshot') as File[];
    const validFiles = filtreazaFisiereIncarcate(files);
    const validare = valideazaAtasamenteImagine(validFiles);
    if (!validare.valid) return json({ error: validare.error }, { status: 400 });
    const paths = await salveazaAtasamenteCaDataUrls(validFiles);

    const cloneIds = formData.get('cloneAtasamente') as string;
    let cloneCai: string[] = [];
    if (cloneIds) {
      const ids: string[] = JSON.parse(cloneIds);
      if (ids.length > 0) {
        const atasamente = await prisma.testCaseAttachment.findMany({
          where: { id: { in: ids } },
          select: { cale: true }
        });
        cloneCai = atasamente.map(a => a.cale);
      }
    }

    const test = await prisma.$transaction(async (tx) => {
      const existingCodes = await tx.testCase.findMany({
        where: { proiectId: params.id, cod: { startsWith: 'TC-' } },
        select: { cod: true }
      });
      const maxNumar = existingCodes.reduce((max, test) => {
        const parsed = Number.parseInt(test.cod.replace(/^TC-/, ''), 10);
        return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
      }, 0);
      const cod = `TC-${maxNumar + 1}`;

      return tx.testCase.create({
        data: {
          cod, titlu, mediu, pasi, rezultatAsteptat,
          rezultatObtinut: rezultatObtinut || '',
          tipTestare, prioritate, proiectId: params.id,
          atasamente: {
            create: [...paths, ...cloneCai].map(cale => ({ cale }))
          }
        },
        include: { atasamente: { select: { id: true, cale: true } } }
      });
    });

    return json(test, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Eroare necunoscută';
    console.error('Create test case failed', error);
    return json({ error: `Crearea testului a eșuat: ${message}` }, { status: 500 });
  }
}
