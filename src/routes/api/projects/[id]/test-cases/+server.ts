import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verificaMembruProiect } from '$lib/server/auth';
import {
  filtreazaFisiereIncarcate,
  salveazaAtasamenteCaDataUrls,
  valideazaAtasamenteImagine
} from '$lib/server/attachments';
import { ensureTestCaseCodeNumbers, parseTestCaseNumber } from '$lib/server/test-case-codes';

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

export async function GET({ locals, params, url }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });

  await ensureTestCaseCodeNumbers(params.id);

  const take = clampTake(url.searchParams.get('take'));
  const offset = Math.max(Number(url.searchParams.get('offset') ?? url.searchParams.get('cursor')) || 0, 0);
  const where = buildWhere(params.id, url);
  const orderBy = buildOrderBy(url.searchParams.get('sort'));

  if (url.searchParams.get('selectIds')) {
    const ids = await prisma.testCase.findMany({ where, orderBy, select: { id: true } });
    return json({ ids: ids.map(t => t.id) });
  }

  const baseWhere = { proiectId: params.id };

  const [totalAll, total, totalManual, totalAutomat, items] = await Promise.all([
    prisma.testCase.count({ where: baseWhere }),
    prisma.testCase.count({ where }),
    prisma.testCase.count({ where: { ...baseWhere, tipTestare: { not: 'automata' } } }),
    prisma.testCase.count({ where: { ...baseWhere, tipTestare: 'automata' } }),
    prisma.testCase.findMany({
      where,
      skip: offset,
      take,
      orderBy,
      include: { atasamente: { select: { id: true, cale: true } } }
    })
  ]);

  const nextOffset = offset + items.length;
  const nextCursor = nextOffset < total ? String(nextOffset) : null;
  return json({ data: items, nextCursor, total, totalAll, totalManual, totalAutomat });
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
          where: { id: { in: ids }, testCase: { proiectId: params.id } },
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
        const parsed = parseTestCaseNumber(test.cod);
        return Math.max(max, parsed);
      }, 0);
      const codNumar = maxNumar + 1;
      const cod = `TC-${codNumar}`;

      return tx.testCase.create({
        data: {
          cod, codNumar, titlu, mediu, pasi, rezultatAsteptat,
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

function clampTake(value: string | null): number {
  const parsed = Number(value) || DEFAULT_TAKE;
  return Math.min(Math.max(parsed, 1), MAX_TAKE);
}

function buildWhere(proiectId: string, url: URL): Record<string, any> {
  const search = url.searchParams.get('search')?.trim() || '';
  const mediu = url.searchParams.get('mediu')?.trim() || '';
  const tipTestare = url.searchParams.get('tipTestare') || '';
  const prioritate = url.searchParams.get('prioritate') || '';
  const and: Record<string, any>[] = [];

  if (search) {
    and.push({
      OR: [
        { cod: containsText(search) },
        { titlu: containsText(search) },
        { pasi: containsText(search) },
        { mediu: containsText(search) }
      ]
    });
  }
  if (mediu) and.push({ mediu: containsText(mediu) });
  if (tipTestare) and.push({ tipTestare });
  if (prioritate) and.push({ prioritate });

  return and.length > 0 ? { proiectId, AND: and } : { proiectId };
}

function containsText(value: string) {
  const databaseUrl = process.env.DATABASE_URL || '';
  if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    return { contains: value, mode: 'insensitive' };
  }
  return { contains: value };
}

function buildOrderBy(sort: string | null) {
  if (sort === 'titlu') return [{ titlu: 'asc' }, { codNumar: 'asc' }, { id: 'asc' }];
  if (sort === 'mediu') return [{ mediu: 'asc' }, { codNumar: 'asc' }, { id: 'asc' }];
  return [{ codNumar: 'asc' }, { cod: 'asc' }, { id: 'asc' }];
}
