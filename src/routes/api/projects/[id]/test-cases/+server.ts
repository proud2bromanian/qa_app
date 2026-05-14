import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verificaMembruProiect } from '$lib/server/auth';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

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

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const MAX_SIZE = 5 * 1024 * 1024;

function valideazaFisiere(files: File[]): { valid: boolean; error?: string } {
  for (const file of files) {
    if (file.size > MAX_SIZE) {
      return { valid: false, error: `Fișierul ${file.name} depășește 5MB` };
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return { valid: false, error: `Tip nepermis: ${file.name}. Folosiți PNG, JPEG, GIF sau WebP.` };
    }
  }
  return { valid: true };
}

function salveazaFisiere(files: File[]): Promise<string[]> {
  return Promise.all(files.map(async (file) => {
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${randomUUID()}.${ext}`;
    const dir = join(process.cwd(), 'static', 'uploads');
    mkdirSync(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(join(dir, fileName), buffer);
    return `/uploads/${fileName}`;
  }));
}

export async function POST({ locals, params, request }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });

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
  const validFiles = files.filter(f => f.size > 0);
  const validare = valideazaFisiere(validFiles);
  if (!validare.valid) return json({ error: validare.error }, { status: 400 });
  const paths = await salveazaFisiere(validFiles);

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
    const result = await tx.$queryRaw<{ maxCod: number | null }[]>`
      SELECT MAX(CAST(SUBSTR(cod, 4) AS INTEGER)) as maxCod
      FROM TestCase
      WHERE proiectId = ${params.id} AND cod LIKE 'TC-%'
    `;
    const maxNumar = result[0]?.maxCod ?? 0;
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
}
