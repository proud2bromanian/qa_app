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
      const tipTestareRaw = (cols[6]?.trim() || '').toLowerCase();
      const tipTestare = tipTestareRaw === 'automata' || tipTestareRaw === 'automată' ? 'automata' : 'manuala';
      const prioritateRaw = (cols[7]?.trim() || '').toLowerCase();
      const prioritateMap: Record<string, string> = {
        critica: 'critica',
        inalta: 'inalta',
        medie: 'medie',
        scazuta: 'scăzuta',
        scăzuta: 'scăzuta'
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

    const imported = await prisma.$transaction(async (tx) => {
      const existingCodes = await tx.testCase.findMany({
        where: { proiectId: params.id, cod: { startsWith: 'TC-' } },
        select: { cod: true }
      });

      let maxNumar = existingCodes.reduce((max, test) => {
        const parsed = Number.parseInt(test.cod.replace(/^TC-/, ''), 10);
        return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
      }, 0);

      const created = [];
      for (const test of testeDeImportat) {
        maxNumar += 1;
        created.push(
          await tx.testCase.create({
            data: {
              ...test,
              cod: `TC-${maxNumar}`,
              proiectId: params.id
            }
          })
        );
      }
      return created;
    });

    return json({
      imported: imported.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Import CSV failed', error);
    return json({ error: 'Importul CSV a eșuat. Verificați formatul fișierului și încercați din nou.' }, { status: 500 });
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
