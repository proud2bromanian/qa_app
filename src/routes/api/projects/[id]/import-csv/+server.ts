import { json } from '@sveltejs/kit';
import prisma from '$lib/server/prisma';
import { verificaMembruProiect } from '$lib/server/auth';

export async function POST({ locals, params, request }) {
  if (!locals.user) return json({ error: 'Neautentificat' }, { status: 401 });
  const { autorizat } = await verificaMembruProiect(locals.user.id, params.id);
  if (!autorizat) return json({ error: 'Nu aveți acces la acest proiect' }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) return json({ error: 'Fișier lipsă' }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length < 2) return json({ error: 'Fișierul nu conține date' }, { status: 400 });

  const imported: any[] = [];
  const errors: string[] = [];

  await prisma.$transaction(async (tx) => {
    const result = await tx.$queryRaw<{ maxCod: number | null }[]>`
      SELECT MAX(CAST(SUBSTR(cod, 4) AS INTEGER)) as maxCod
      FROM TestCase
      WHERE proiectId = ${params.id} AND cod LIKE 'TC-%'
    `;
    let maxNumar = result[0]?.maxCod ?? 0;

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      const titlu = cols[1]?.trim();
      const mediu = cols[2]?.trim();
      const pasi = cols[3]?.trim();
      const rezultatAsteptat = cols[4]?.trim();
      const tipTestareRaw = (cols[6]?.trim() || '').toLowerCase();
      const tipTestare = tipTestareRaw === 'automata' || tipTestareRaw === 'automată' ? 'automata' : 'manuala';
      const prioritateRaw = (cols[7]?.trim() || '').toLowerCase();
      const prioritateValide = ['critica', 'inalta', 'medie', 'scăzuta'];
      const prioritate = prioritateValide.includes(prioritateRaw) ? prioritateRaw : 'medie';

      if (!titlu || !mediu || !pasi || !rezultatAsteptat) {
        errors.push(`Linia ${i + 1}: câmpuri obligatorii lipsă (Titlu, Mediu, Pași, Rezultat Așteptat)`);
        continue;
      }

      try {
        maxNumar++;
        const test = await tx.testCase.create({
          data: {
            cod: `TC-${maxNumar}`,
            titlu,
            mediu,
            pasi,
            rezultatAsteptat,
            rezultatObtinut: cols[5]?.trim() || '',
            tipTestare,
            prioritate,
            proiectId: params.id
          }
        });
        imported.push(test);
      } catch (e: any) {
        errors.push(`Linia ${i + 1}: eroare la salvare — ${e.message}`);
      }
    }
  });

  return json({
    imported: imported.length,
    errors: errors.length > 0 ? errors : undefined
  });
}

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (inQuotes && csv[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
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
