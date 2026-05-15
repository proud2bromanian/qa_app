import prisma from '$lib/server/prisma';

const backfilledProjects = new Set<string>();

export function parseTestCaseNumber(cod: string | null | undefined): number {
  const match = (cod || '').match(/\d+/);
  if (!match) return 0;

  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function ensureTestCaseCodeNumbers(proiectId: string) {
  if (backfilledProjects.has(proiectId)) return;

  const teste = await prisma.testCase.findMany({
    where: { proiectId, codNumar: 0, cod: { not: '' } },
    select: { id: true, cod: true, codNumar: true }
  });

  const updates = teste
    .map((test) => ({ id: test.id, codNumar: parseTestCaseNumber(test.cod) }))
    .filter((test) => test.codNumar > 0);

  for (let i = 0; i < updates.length; i += 50) {
    const batch = updates.slice(i, i + 50);
    await prisma.$transaction(
      batch.map((test) =>
        prisma.testCase.update({
          where: { id: test.id },
          data: { codNumar: test.codNumar }
        })
      )
    );
  }

  backfilledProjects.add(proiectId);
}
