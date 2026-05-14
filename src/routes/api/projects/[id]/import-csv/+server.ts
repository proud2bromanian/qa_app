import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verificaMembruProiect } from '$lib/server/auth';

export async function POST({ locals, params, request }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return json({ error: 'Fișier lipsă' }, { status: 400 });

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) return json({ error: 'Fișierul nu conține date' }, { status: 400 });

    const errors: string[] = [];
    const testeDeImportat: Array<{
      titlu: string;
      mediu: string;
      pasi: string;
      rezultatAsteptat: string;
      rezultatObtinut: string;
      tipTestare: string;
      prioritate: string;
    }> = [];

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      const titlu = cols[1]?.trim();
      const mediu = cols[2]?.trim();
      const pasi = cols[3]?.trim();
      const rezultatAsteptat = cols[4]?.trim();
      const tipTestareRaw = normalizeCsvValue(cols[6]);
      const tipTestare = ['automata', 'automat', 'automated', 'automation'].includes(tipTestareRaw) ? 'automata' : 'manuala';
      const prioritateRaw = normalizeCsvValue(cols[7]);
      const prioritateMap: Record<string, string> = {
        critica: 'critica',
        critic: 'critica',
        critical: 'critica',
        inalta: 'inalta',
        inalt: 'inalta',
        high: 'inalta',
        medie: 'medie',
        medium: 'medie',
        scazuta: 'scăzuta',
        scazut: 'scăzuta',
        low: 'scăzuta'
      };
      const prioritate = prioritateMap[prioritateRaw] || 'medie';

      if (!titlu || !mediu || !pasi || !rezultatAsteptat) {
        errors.push(`Linia ${i + 1}: câmpuri obligatorii lipsă (Titlu, Mediu, Pași, Rezultat Așteptat)`);
        continue;
      }

      testeDeImportat.push({
        titlu,
        mediu,
        pasi,
        rezultatAsteptat,
        rezultatObtinut: cols[5]?.trim() || '',
        tipTestare,
        prioritate
      });
    }

    if (testeDeImportat.length === 0) {
      return json({ imported: 0, errors });
    }

    const existingCodes = await prisma.testCase.findMany({
      where: { proiectId: params.id, cod: { startsWith: 'TC-' } },
      select: { cod: true }
    });

    let maxNumar = existingCodes.reduce((max, test) => {
      const parsed = Number.parseInt(test.cod.replace(/^TC-/, ''), 10);
      return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
    }, 0);

    const data = testeDeImportat.map((test) => {
      maxNumar += 1;
      return {
        ...test,
        cod: `TC-${maxNumar}`,
        proiectId: params.id
      };
    });

    let imported = 0;
    for (let i = 0; i < data.length; i += 100) {
      const batch = data.slice(i, i + 100);
      const result = await prisma.testCase.createMany({ data: batch });
      imported += result.count;
    }

    return json({
      imported,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Eroare necunoscută';
    console.error('Import CSV failed', error);
    return json({ error: `Importul CSV a eșuat: ${message}` }, { status: 500 });
  }
}

function detectDelimiter(csv: string): ',' | ';' {
  const firstLine = csv.split(/\r?\n/).find((line) => line.trim()) || '';
  let commaCount = 0;
  let semicolonCount = 0;
  let inQuotes = false;

  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (ch === '"') {
      if (inQuotes && firstLine[i + 1] === '"') i++;
      else inQuotes = !inQuotes;
    } else if (!inQuotes && ch === ',') {
      commaCount += 1;
    } else if (!inQuotes && ch === ';') {
      semicolonCount += 1;
    }
  }

  return semicolonCount > commaCount ? ';' : ',';
}

function normalizeCsvValue(value: string | undefined): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseCSV(csv: string): string[][] {
  const delimiter = detectDelimiter(csv);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let current = '';
  let inQuotes = false;
  csv = csv.replace(/^\uFEFF/, '');

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (inQuotes && csv[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      currentRow.push(current.trim());
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && csv[i + 1] === '\n') i++;
      currentRow.push(current.trim());
      current = '';
      if (currentRow.length > 0 && currentRow.some(c => c !== '')) rows.push(currentRow);
      currentRow = [];
    } else {
      current += ch;
    }
  }
  if (current.trim() || currentRow.length > 0) {
    currentRow.push(current.trim());
    if (currentRow.some(c => c !== '')) rows.push(currentRow);
  }
  return rows;
}
