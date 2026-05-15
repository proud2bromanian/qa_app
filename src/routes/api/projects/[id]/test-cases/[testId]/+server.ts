import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verificaMembruProiect } from '$lib/server/auth';
import {
  filtreazaFisiereIncarcate,
  salveazaAtasamenteCaDataUrls,
  valideazaAtasamenteImagine
} from '$lib/server/attachments';

export async function GET({ locals, params }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  const test = await prisma.testCase.findFirst({
    where: { id: params.testId, proiectId: params.id },
    include: { atasamente: { select: { id: true, cale: true } } }
  });
  if (!test) return json({ error: 'Test negăsit' }, { status: 404 });
  return json(test);
}

export async function PATCH({ locals, params, request }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });

  const existing = await prisma.testCase.findFirst({
    where: { id: params.testId, proiectId: params.id }
  });
  if (!existing) return json({ error: 'Test negăsit în acest proiect' }, { status: 404 });

  const contentType = request.headers.get('content-type') || '';
  let data: Record<string, any> = {};

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    if (formData.get('titlu')) data.titlu = formData.get('titlu') as string;
    if (formData.get('mediu')) data.mediu = formData.get('mediu') as string;
    if (formData.get('pasi')) data.pasi = formData.get('pasi') as string;
    if (formData.get('rezultatAsteptat')) data.rezultatAsteptat = formData.get('rezultatAsteptat') as string;
    if (formData.get('rezultatObtinut') !== null) data.rezultatObtinut = formData.get('rezultatObtinut') as string;
    if (formData.get('tipTestare')) data.tipTestare = formData.get('tipTestare') as string;
    if (formData.get('prioritate')) data.prioritate = formData.get('prioritate') as string;

    const files = formData.getAll('screenshot') as File[];
    const newFiles = filtreazaFisiereIncarcate(files);
    const validare = valideazaAtasamenteImagine(newFiles);
    if (!validare.valid) return json({ error: validare.error }, { status: 400 });

    const pastreaza = formData.get('pastreazaAtasamente') as string;
    const idsPastrate: string[] = pastreaza ? JSON.parse(pastreaza) : [];

    const atasamenteExisting = await prisma.testCaseAttachment.findMany({
      where: { testCaseId: params.testId },
      select: { id: true }
    });
    const idsDeSters = atasamenteExisting
      .filter(a => !idsPastrate.includes(a.id))
      .map(a => a.id);
    if (idsDeSters.length > 0) {
      await prisma.testCaseAttachment.deleteMany({ where: { id: { in: idsDeSters } } });
    }

    const paths = await salveazaAtasamenteCaDataUrls(newFiles);
    for (const cale of paths) {
      await prisma.testCaseAttachment.create({
        data: { testCaseId: params.testId, cale }
      });
    }
  } else {
    data = await request.json();
  }

  if (Object.keys(data).length > 0) {
    await prisma.testCase.update({ where: { id: params.testId }, data });
  }

  const test = await prisma.testCase.findUnique({
    where: { id: params.testId },
    include: { atasamente: { select: { id: true, cale: true } } }
  });
  return json(test);
}

export async function DELETE({ locals, params }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });
  await prisma.testCase.delete({ where: { id: params.testId } });
  return json({ success: true });
}
